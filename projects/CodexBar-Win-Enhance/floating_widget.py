"""
Floating Widget - красивый летающий виджет для CodexBar
Плавает по экрану, показывает процент, перетаскивается мышкой
"""

import customtkinter as ctk
from PIL import Image, ImageDraw
import math


class FloatingWidget(ctk.CTkToplevel):
    """
    Летающий круглый виджет с процентом использования.
    Всегда наверху, перетаскивается, красивые анимации.
    """
    
    SIZE = 80
    BORDER_WIDTH = 3
    
    # Цвета для разных уровней использования
    COLORS = {
        'low': ('#10B981', '#059669'),      # Зелёный градиент
        'medium': ('#F59E0B', '#D97706'),   # Оранжевый градиент
        'high': ('#EF4444', '#DC2626'),     # Красный градиент
    }
    
    def __init__(self, master=None, percentage=0, provider="Z.AI"):
        super().__init__(master)
        self.percentage = percentage
        self.provider = provider
        self._drag_data = {'x': 0, 'y': 0}
        
        # Настройка окна
        self.overrideredirect(True)
        self.attributes('-topmost', True)
        self.attributes('-transparentcolor', '#000001')  # Прозрачный фон
        self.configure(fg_color='#000001')
        
        # Размер и позиция (правый нижний угол экрана)
        self.geometry(f"{self.SIZE}x{self.SIZE}+1200+700")
        
        # Создаём UI
        self._create_ui()
        self._create_menu()
        
        # Привязка событий
        self._bind_events()
        
        # Анимация появления
        self._animate_in()
    
    def _create_ui(self):
        """Создаём красивый круглый виджет"""
        # Главный фрейм (круглый через изображение)
        self.canvas = ctk.CTkCanvas(
            self, 
            width=self.SIZE, 
            height=self.SIZE,
            bg='#000001',
            highlightthickness=0
        )
        self.canvas.pack(fill='both', expand=True)
        
        # Создаём круглое изображение
        self._update_appearance()
        
        # Текст с процентом (CTkLabel поверх canvas)
        self.label_frame = ctk.CTkFrame(self, fg_color='transparent', width=self.SIZE, height=self.SIZE)
        self.label_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        self.percent_label = ctk.CTkLabel(
            self.label_frame,
            text=f"{self.percentage}%",
            font=('Inter', 20, 'bold'),
            text_color='white'
        )
        self.percent_label.pack(pady=(15, 0))
        
        self.provider_label = ctk.CTkLabel(
            self.label_frame,
            text=self.provider[:4],
            font=('Inter', 9),
            text_color='white'
        )
        self.provider_label.pack()
    
    def _create_menu(self):
        """Контекстное меню по правому клику"""
        self.menu = ctk.CTkToplevel(self)
        self.menu.overrideredirect(True)
        self.menu.withdraw()
        self.menu.attributes('-topmost', True)
        
        menu_frame = ctk.CTkFrame(self.menu, fg_color='#1e1e2e', corner_radius=8)
        menu_frame.pack(padx=2, pady=2)
        
        ctk.CTkButton(
            menu_frame, text="Open CodexBar", 
            command=self._on_open,
            fg_color='transparent', hover_color='#313244',
            anchor='w', width=120
        ).pack(fill='x', padx=4, pady=2)
        
        ctk.CTkButton(
            menu_frame, text="Settings", 
            command=self._on_settings,
            fg_color='transparent', hover_color='#313244',
            anchor='w', width=120
        ).pack(fill='x', padx=4, pady=2)
        
        ctk.CTkButton(
            menu_frame, text="Close Widget", 
            command=self._on_close,
            fg_color='transparent', hover_color='#313244',
            anchor='w', width=120
        ).pack(fill='x', padx=4, pady=2)
    
    def _update_appearance(self):
        """Обновляем цвет в зависимости от процента"""
        if self.percentage <= 50:
            colors = self.COLORS['low']
        elif self.percentage <= 80:
            colors = self.COLORS['medium']
        else:
            colors = self.COLORS['high']
        
        # Создаём градиентное круглое изображение
        img = Image.new('RGBA', (self.SIZE, self.SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Градиентный круг
        for i in range(self.SIZE // 2, 0, -1):
            ratio = i / (self.SIZE // 2)
            r = int(int(colors[0][1:3], 16) * ratio + int(colors[1][1:3], 16) * (1 - ratio))
            g = int(int(colors[0][3:5], 16) * ratio + int(colors[1][3:5], 16) * (1 - ratio))
            b = int(int(colors[0][5:7], 16) * ratio + int(colors[1][5:7], 16) * (1 - ratio))
            draw.ellipse(
                [self.SIZE//2 - i, self.SIZE//2 - i, 
                 self.SIZE//2 + i, self.SIZE//2 + i],
                fill=(r, g, b, 230)
            )
        
        # Белая обводка
        draw.ellipse(
            [2, 2, self.SIZE-2, self.SIZE-2],
            outline='white', width=2
        )
        
        self.photo = ctk.CTkImage(img, size=(self.SIZE, self.SIZE))
        self.canvas.create_image(self.SIZE//2, self.SIZE//2, image=self.photo)
    
    def _bind_events(self):
        """Привязка событий мыши"""
        # Левый клик - начать перетаскивание
        self.bind('<ButtonPress-1>', self._start_drag)
        self.bind('<B1-Motion>', self._on_drag)
        self.label_frame.bind('<ButtonPress-1>', self._start_drag)
        self.label_frame.bind('<B1-Motion>', self._on_drag)
        self.percent_label.bind('<ButtonPress-1>', self._start_drag)
        self.percent_label.bind('<B1-Motion>', self._on_drag)
        
        # Правый клик - меню
        self.bind('<ButtonPress-3>', self._show_menu)
        self.label_frame.bind('<ButtonPress-3>', self._show_menu)
        
        # Двойной клик - открыть основное окно
        self.bind('<Double-Button-1>', lambda e: self._on_open())
        self.label_frame.bind('<Double-Button-1>', lambda e: self._on_open())
        
        # Скрыть меню при клике вне него
        self.bind('<ButtonPress-1>', self._hide_menu, add='+')
    
    def _start_drag(self, event):
        """Начало перетаскивания"""
        self._drag_data['x'] = event.x_root - self.winfo_x()
        self._drag_data['y'] = event.y_root - self.winfo_y()
        self._hide_menu()
    
    def _on_drag(self, event):
        """Перетаскивание"""
        x = event.x_root - self._drag_data['x']
        y = event.y_root - self._drag_data['y']
        self.geometry(f'+{x}+{y}')
    
    def _show_menu(self, event):
        """Показать контекстное меню"""
        self.menu.geometry(f'+{event.x_root}+{event.y_root}')
        self.menu.deiconify()
    
    def _hide_menu(self, event=None):
        """Скрыть меню"""
        self.menu.withdraw()
    
    def _animate_in(self):
        """Анимация появления"""
        self.attributes('-alpha', 0.0)
        self._fade_in(0)
    
    def _fade_in(self, step):
        """Плавное появление"""
        if step < 10:
            alpha = step / 10
            self.attributes('-alpha', alpha)
            self.after(20, lambda: self._fade_in(step + 1))
        else:
            self.attributes('-alpha', 1.0)
    
    def update_percentage(self, percentage, provider=None):
        """Обновить процент и цвет"""
        self.percentage = percentage
        if provider:
            self.provider = provider
        
        self.percent_label.configure(text=f"{percentage}%")
        self.provider_label.configure(text=self.provider[:4])
        self._update_appearance()
    
    def _on_open(self):
        """Открыть основное окно"""
        print("Open main window")
        self._hide_menu()
    
    def _on_settings(self):
        """Открыть настройки"""
        print("Open settings")
        self._hide_menu()
    
    def _on_close(self):
        """Закрыть виджет"""
        self.menu.destroy()
        self.destroy()


def test():
    """Тест летающего виджета"""
    root = ctk.CTk()
    root.withdraw()
    
    widget = FloatingWidget(percentage=75, provider="Z.AI")
    
    # Демо: меняем процент каждые 3 секунды
    def demo_update():
        import random
        pct = random.randint(10, 95)
        widget.update_percentage(pct, random.choice(["Z.AI", "MM", "CL", "OC"]))
        widget.after(3000, demo_update)
    
    widget.after(3000, demo_update)
    
    root.mainloop()


if __name__ == "__main__":
    test()
