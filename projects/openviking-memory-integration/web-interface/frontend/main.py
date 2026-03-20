"""Fixed main.py - Bug fixes for tree click and sync"""
import gradio as gr
import httpx
import pandas as pd
from datetime import date
from typing import Optional, Tuple, List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_URL = "http://localhost:8000/api"
HTTP_TIMEOUT = 30
SEARCH_HEADERS = ["URI", "Название", "Дата", "Категория", "Abstract", "Score", "Уровень"]
_tree_state = {}

async def http_get(endpoint: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            url = f"{BACKEND_URL}{endpoint}"
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        raise gr.Error(f"⏱️ Таймаут запроса к бэкенду ({endpoint})")
    except httpx.HTTPStatusError as e:
        error_text = e.response.text if e.response.content else str(e)
        raise gr.Error(f"❌ Ошибка сервера ({e.response.status_code}): {error_text}")
    except httpx.ConnectError:
        raise gr.Error(f" Не удалось подключиться к бэкенду. Убедитесь, что он запущен на порту 7860.")
    except Exception as e:
        raise gr.Error(f"⚠️ Ошибка запроса: {str(e)}")

def format_uri_for_display(uri: str) -> str:
    if uri.startswith("viking://resources/"):
        return uri[len("viking://resources/"):]
    return uri

async def perform_search(query, date_from, date_to, category, pattern, top_k):
    params = {"query": query.strip() if query else "", "limit": str(top_k)}
    result = await http_get("/search", params)
    resources = result.get("resources", [])
    total = result.get("total", len(resources))
    data = []
    for res in resources:
        uri = res.get("uri", "")
        name = res.get("name") or (uri.split("/")[-1] if uri else "")
        scope = "-"
        if uri.startswith("viking://"):
            parts = uri.split("/")
            if len(parts) > 2:
                scope = parts[2]
        score = res.get("score") or 0
        score_str = f"{score:.3g}" if isinstance(score, (int, float)) and (abs(score) >= 1e6 or (abs(score) < 1e-3 and score != 0)) else f"{score:.3f}" if isinstance(score, (int, float)) else str(score)
        data.append([uri, name, res.get("date") or "-", str(res.get("category") or "-"), (res.get("abstract") or "")[:200], score_str, scope])
    df = pd.DataFrame(data, columns=SEARCH_HEADERS)
    return f"✅ Найдено **{total}** ресурсов", df, ""

async def load_tree(path: str):
    params = {"path": path} if path else {}
    result = await http_get("/tree", params)
    tree_path = result.get("path", path)
    children = result.get("children", [])
    _tree_state[tree_path] = {"path": tree_path, "children": children, "expanded": set()}
    html = generate_tree_html(tree_path, children, indent=0)
    return f"✅ Дерево загружено: **{tree_path}** ({len(children)} элементов)", html

def generate_tree_html(path, children, indent=0, parent_path=""):
    if not children:
        return "&nbsp;Нет элементов".encode().decode("unicode_escape")
    html_parts = [f"<div style='margin-left: {indent * 20}px;'>"]
    for node in children:
        name = node.get("name", "")
        node_type = node.get("type", "file")
        node_path = node.get("path", "")
        size = node.get("size")
        node_date = node.get("date", "")
        meta_parts = []
        if size:
            meta_parts.append(f"{size / 1024:.1f} KB")
        if node_date:
            meta_parts.append(node_date[:10] if len(node_date) >= 10 else node_date)
        meta_str = " • ".join(meta_parts) if meta_parts else ""
        icon = "" if node_type == "directory" else ""
        if node_type == "directory":
            node_id = f"tree-node-{node_path.replace('/', '-').replace(':', '')}"
            html_parts.append(f"""<div id='{node_id}' class='tree-node' style='padding: 4px 2px; color: #e5e7eb; background-color: transparent; cursor: pointer; line-height: 1.5;'><span style='cursor: pointer; user-select: none;' onclick="loadSubtree('{node_path}')">▶</span><span style='cursor: pointer;' onclick="openResourceFromTree('{node_path}')">{icon} <strong>{name}</strong></span><span style='color: #9ca3af; font-size: 0.85em;'>{meta_str}</span></div>""")
            html_parts.append(f"<div id='tree-{node_path.replace('/', '-').replace(':', '')}' style='display:none; margin-left: 20px;'></div>")
        else:
            node_id = f"tree-node-{node_path.replace('/', '-').replace(':', '')}"
            html_parts.append(f"""<div id='{node_id}' class='tree-node' style='padding: 4px 2px; color: #e5e7eb; background-color: transparent; cursor: pointer; line-height: 1.5;'><span style='cursor: pointer;' onclick="openResourceFromTree('{node_path}')">{icon} {name}</span><span style='color: #9ca3af; font-size: 0.85em;'>{meta_str}</span></div>""")
    html_parts.append("</div>")
    return "\n".join(html_parts)

async def load_subtree(path: str):
    result = await http_get("/tree", {"path": path})
    children = result.get("children", [])
    return generate_tree_html(path, children, indent=0, parent_path=path)

async def open_resource_from_tree(uri: str):
    return await open_resource_viewer(uri)

async def load_resource_content(uri: str, level: str):
    result = await http_get(f"/resource/{uri}", {"level": level})
    return result.get("content", "")

async def open_resource_viewer(uri: str):
    display_uri = format_uri_for_display(uri)
    title = f"##  Просмотр: `{display_uri}`"
    l0_content = await load_resource_content(uri, "L0")
    l1_content = "<em style='color: #666;'>Переключитесь на вкладку 'Overview' для загрузки...</em>"
    l2_content = "<em style='color: #666;'>Переключитесь на вкладку 'Full' для загрузки...</em>"
    return title, l0_content, l1_content, l2_content, True, 0

async def open_resource_viewer_wrapper(uri: str):
    return await open_resource_viewer(uri)

async def check_health() -> str:
    result = await http_get("/health")
    status = result.get("status", "unknown")
    timestamp = result.get("timestamp", "")
    openviking_status = result.get("openviking", "unknown")
    status_icon = "✅" if status == "healthy" else "❌"
    ov_icon = "" if openviking_status == "connected" else ""
    return f"""<div style='padding: 15px; background: #f0f0f0; border-radius: 8px;'><p><strong>Статус:</strong> {status_icon} {status.upper()}</p><p><strong>OpenViking:</strong> {ov_icon} {openviking_status}</p><p><strong>Время:</strong> {timestamp}</p></div>"""

def create_gradio_app() -> gr.Blocks:
    custom_css = """ 
.gr-button.primary { background-color: #2563eb !important; border-color: #2563eb !important; color: white !important; }
.gr-row { gap: 10px; }
.tree-node { padding: 4px 2px; cursor: pointer; line-height: 1.5; }
.tree-node:hover { background-color: #e5e7eb; }
.tree-container { min-height: 800px; max-height: 1000px; overflow-y: auto; border: 1px solid #374151; padding: 10px; border-radius: 6px; background-color: #1f2937 !important; color: #e5e7eb !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; }
.tree-node span { color: #e5e7eb !important; }
.tree-node.highlighted { background-color: #3b82f6 !important; color: #ffffff !important; }
.tree-node.highlighted span { color: #ffffff !important; }
.search-results table { width: 100% !important; border-collapse: collapse; }
.search-results th { background-color: #374151 !important; color: #e5e7eb !important; font-weight: 700; border: 1px solid #374151 !important; padding: 8px; }
.search-results td { color: #e5e7eb !important; border: 1px solid #e5e7eb !important; padding: 6px 8px; vertical-align: top; }
.search-results tr:hover { background-color: #f9fafb !important; }
.search-results tr:first-child th { border-top: 2px solid #9ca3af; }
.viewer-tabs .gr-tab-nav button { font-weight: 600; color: #374151 !important; }
.viewer-tabs .gr-tab-nav button.selected { background-color: #2563eb !important; color: white !important; border-color: #2563eb !important; }
.viewer-content { min-height: 200px; background-color: #ffffff; color: #111827; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; margin-top: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; line-height: 1.6; overflow-y: auto; max-height: 600px; }
"""
    
    custom_js = r"""
    <script>
    async function loadSubtree(path) {
        const event = new CustomEvent('loadSubtree', { detail: { path: path } });
        document.dispatchEvent(event);
    }
    
    async function openResourceFromTree(uri) {
        console.log('openResourceFromTree called with URI:', uri);
        const input = document.querySelector('input[name="tree_click_uri"]');
        if (input) {
            input.value = uri;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.error('Input element not found for tree_click_uri');
        }
    }
    
    function selectTreeNode(uri) {
        document.querySelectorAll('.tree-node-highlighted').forEach(el => {
            el.classList.remove('tree-node-highlighted');
            el.style.backgroundColor = '';
        });
        const nodeId = 'tree-node-' + uri.replace(/\//g, '-').replace(/:/g, '');
        const node = document.getElementById(nodeId);
        if (node) {
            node.classList.add('tree-node-highlighted');
            node.style.backgroundColor = '#dbeafe';
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function expandAndHighlightNode(uri) {
        console.log('expandAndHighlightNode called with URI:', uri);
        const parts = uri.split('/');
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath += parts[i] + '/';
            const folderContainerId = 'tree-' + currentPath.replace(/\//g, '-').replace(/:/g, '');
            const container = document.getElementById(folderContainerId);
            if (container) {
                console.log('Expanding folder:', currentPath);
                container.style.display = 'block';
                const folderNodeId = 'tree-node-' + currentPath.replace(/\//g, '-').replace(/:/g, '');
                const folderNode = document.getElementById(folderNodeId);
                if (folderNode) {
                    const expandIcon = folderNode.querySelector('span[onclick*="loadSubtree"]');
                    if (expandIcon && expandIcon.textContent === '▶') {
                        expandIcon.textContent = '▼';
                    }
                }
            }
        }
        selectTreeNode(uri);
    }
    </script>
    """
    
    with gr.Blocks(title="OpenViking Memory", theme=gr.themes.Soft(), css=custom_css) as demo:
        gr.Markdown("""<h1 style='text-align: center; color: #333;'>OpenViking Memory<br><small style='font-size: 14px; color: #666;'>Web interface for semantic memory exploration</small></h1>""")
        
        selected_uri = gr.State(value="")
        viewer_visible = gr.State(value=False)
        
        # БАГ #1 FIX: Скрытый Textbox для передачи URI из дерева
        tree_click_uri = gr.Textbox(label="Tree Click URI", visible=False)
        
        with gr.Column(visible=False, elem_id="viewer_panel") as viewer_panel:
            gr.HTML("<hr style='border: 1px solid #ddd;'>")
            with gr.Row():
                viewer_title = gr.Markdown("## Resource Viewer")
                close_viewer_button = gr.Button("X Close", size="sm")
            viewer_tabs = gr.Tabs(visible=True)
            with viewer_tabs:
                with gr.Tab("Abstract (L0)", id=0):
                    l0_content = gr.TextArea(label="Summary", lines=10, interactive=False)
                with gr.Tab("Overview (L1)", id=1):
                    l1_content = gr.TextArea(label="Overview", lines=25, interactive=False)
                with gr.Tab("Read (L2)", id=2):
                    l2_content = gr.TextArea(label="Full Content", lines=40, interactive=False)
        
        with gr.Tabs():
            with gr.Tab(" Поиск", id=0):
                with gr.Row():
                    with gr.Column(scale=3):
                        search_query = gr.Textbox(label=" Запрос", placeholder="Введите ключевые слова для поиска...", value="")
                with gr.Row():
                    with gr.Column(scale=1):
                        search_date_from = gr.Textbox(label=" Дата от (YYYY-MM-DD)", placeholder="2026-01-01", value="")
                    with gr.Column(scale=1):
                        search_date_to = gr.Textbox(label=" Дата до (YYYY-MM-DD)", placeholder=date.today().isoformat(), value=date.today().isoformat())
                with gr.Row():
                    with gr.Column(scale=2):
                        search_category = gr.Textbox(label="️ Категория", placeholder="Все (или введите категорию)", value="Все")
                    with gr.Column(scale=3):
                        search_pattern = gr.Textbox(label=" Шаблон (regex)", placeholder="pattern.* (опционально)", value="")
                with gr.Row():
                    with gr.Column(scale=1):
                        search_top_k = gr.Slider(minimum=1, maximum=100, value=10, step=1, label=" Лимит")
                    with gr.Column(scale=2):
                        search_button = gr.Button(" Найти", variant="primary", size="lg")
                search_status = gr.Markdown("**Статус:** Готов к поиску")
                search_results = gr.Dataframe(type="pandas", interactive=False, datatype=["str", "str", "str", "str", "str", "str", "str"], wrap=True, row_count=10, label="Результаты поиска", value=[])
                search_button.click(fn=perform_search, inputs=[search_query, search_date_from, search_date_to, search_category, search_pattern, search_top_k], outputs=[search_status, search_results, selected_uri])
                # БАГ #2 FIX: Клик по таблице разворачивает путь в дереве и выделяет ноду
                search_results.change(fn=lambda row: row.iloc[0, 0] if not row.empty else "", inputs=[search_results], outputs=[selected_uri]).then(fn=open_resource_viewer_wrapper, inputs=[selected_uri], outputs=[viewer_title, l0_content, l1_content, l2_content, viewer_panel, viewer_tabs], js="(uri) => { if(uri) expandAndHighlightNode(uri); }")
            
            with gr.Tab(" Ресурсы", id=1):
                with gr.Row():
                    with gr.Column(scale=3):
                        tree_root_path = gr.Textbox(label=" Корневая папка", value="viking://resources/", placeholder="viking://resources/")
                    with gr.Column(scale=1):
                        load_tree_button = gr.Button(" Загрузить", variant="primary")
                tree_status = gr.Markdown("**Статус:** Нажмите 'Загрузить' для отображения дерева")
                tree_display = gr.HTML(value="", label="Дерево ресурсов", elem_id="tree-container", elem_classes=["tree-container"])
                load_tree_button.click(fn=load_tree, inputs=[tree_root_path], outputs=[tree_status, tree_display])
                # БАГ #1 FIX: Обработчик клика по ноде дерева
                tree_click_uri.change(fn=open_resource_from_tree, inputs=[tree_click_uri], outputs=[viewer_title, l0_content, l1_content, l2_content, viewer_panel, viewer_tabs])
            
            with gr.Tab("ℹ️ Инфо", id=2):
                gr.Markdown("""###  Об сервисе
                    
                    **OpenViking Memory** - веб-интерфейс для исследования и чтения информации из семантической памяти OpenViking.
                    
                    ####  Возможности:
                    -  **Поиск** - поиск по ключевым словам с фильтрами
                    -  **Дерево ресурсов** - навигация по файловой структуре
                    -  **Просмотр L0/L1/L2** - уровни детализации контента
                    
                    ####  Уровни детализации:
                    | Уровень | Описание | Время |
                    |---------|----------|-------|
                    | **L0** | Abstract - краткое резюме | < 500 мс |
                    | **L1** | Overview - обзор с навигацией | < 1 сек |
                    | **L2** | Full - полный контент | < 2 сек |
                    """)
                gr.Markdown("###  Health Check")
                with gr.Row():
                    health_button = gr.Button(" Проверить статус", variant="primary")
                health_result = gr.HTML(value="")
                health_button.click(fn=check_health, inputs=[], outputs=[health_result])
                gr.Markdown("""### ️ Техническая информация
                    
                    - **Backend:** FastAPI 0.104+
                    - **Frontend:** Gradio 3.50+
                    - **Port:** 7860
                    - **API Docs:** [/docs](http://localhost:7860/docs)
                    """)
        
    return demo

if __name__ == "__main__":
    logger.info("Creating Gradio app...")
    demo = create_gradio_app()
    logger.info("Launching on http://localhost:7860 (or next available port)")
    demo.launch(server_name="127.0.0.1", server_port=7860, share=False, show_error=True, quiet=True)
