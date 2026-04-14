"""
Floating Widget - Black Glassmorphism Edition
Летающий виджет в стиле glassmorphism для CodexBar
"""

import customtkinter as ctk
from PIL import Image, ImageDraw, ImageFont as PILImageFont
import math


class FloatingWidget(ctk.CTkToplevel):
    """
    Летающий виджет в стиле glassmorphism.
    Чёрный полупрозрачный скруглённый прямоугольник.
    """
    
    WIDTH = 120
    HEIGHT = 60
    CORNER_RADIUS = 16
    
    def __init__(self, master=None, percentage=0, provider="MM"):
        super().__init__(master)
        self.percentage = percentage
        self.provider = provider
        self._drag_data = {'x': 0, 'y': 0}
        
        # Настройка окна - делаем фон прозрачным
        self.overrideredirect(True)
        self.attributes('-topmost', True)
        self.attributes('-transparentcolor', '#000000')
        self.configure(fg_color='#000000')
        
        # Размер и позиция
        self.geometry(f"{self.WIDTH}x{self.HEIGHT}+1200+700")
        
        # Создаём UI
        self._create_ui()
        
        # Привязка событий
        self._bind_events()
        
        # Анимация появления
        self._animate_in()
    
    def _make_glassmorphism_image(self):
        """
        Создаёт изображение в стиле black glassmorphism:
        - Чёрный полупрозрачный фон
        - Скруглённые углы
        - Тонкая светлая граница
        - Лёгкий внутренний градиент для объёма
        """
        # Размер с учётом border
        img_size = max(self.WIDTH, self.HEIGHT)
        img = Image.new('RGBA', (img_size, img_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Центр и радиус
        cx, cy = img_size // 2, img_size // 2
        
        # Внешний скруглённый прямоугольник (фон)
        # Alpha канал для прозрачности: 180 = ~70% opacity
        bg_color = (15, 15, 20, 200)  # Почти чёрный с небольшой прозрачностью
        border_color = (255, 255, 255, 40)  # Очень тонкая белая граница
        
        # Рисуем скруглённый прямоугольник с border
        r = self.CORNER_RADIUS
        
        # Внешняя форма (border)
        draw.rounded_rectangle(
            [1, 1, img_size - 1, img_size - 1],
            radius=r,
            fill=border_color
        )
        
        # Внутренняя форма (основной фон) - чуть меньше
        inner_size = img_size - 4
        draw.rounded_rectangle(
            [2, 2, inner_size, inner_size],
            radius=r - 1,
            fill=bg_color
        )
        
        # Добавляем лёгкий highlight сверху (имитация отражения света)
        highlight_height = inner_size // 3
        for i in range(highlight_height):
            alpha = int(15 * (1 - i / highlight_height))  # Плавно уменьшается
            y = 2 + i
            highlight_color = (255, 255, 255, alpha)
            draw.line([(r, y), (inner_size - r, y)], fill=highlight_color, width=1)
        
        return img
    
    def _create_ui(self):
        """Создаём glassmorphism виджет"""
        # Canvas для фона
        self.canvas = ctk.CTkCanvas(
            self,
            width=self.WIDTH,
            height=self.HEIGHT,
            bg='#000000',
            highlightthickness=0
        )
        self.canvas.pack(fill='both', expand=True)
        
        # Создаём и отображаем фоновое изображение
        self._bg_image = self._make_glassmorphism_image()
        self._photo = ctk.CTkImage(self._bg_image, size=(self.WIDTH, self.HEIGHT))
        self.canvas.create_image(self.WIDTH // 2, self.HEIGHT // 2, image=self._photo, anchor='center')
        
        # Текст поверх
        self.label_frame = ctk.CTkFrame(self, fg_color='transparent', width=self.WIDTH, height=self.HEIGHT)
        self.label_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        self.percent_label = ctk.CTkLabel(
            self.label_frame,
            text=f"{self.percentage}%",
            font=('Inter', 22, 'bold'),
            text_color='white',
            fg_color='transparent'
        )
        self.percent_label.pack(anchor='center', pady=(2, 0))
        
        self.provider_label = ctk.CTkLabel(
            self.label_frame,
            text=self.provider,
            font=('Inter', 10),
            text_color='rgba(255,255,255,0.6)',
            fg_color='transparent'
        )
        self.provider_label.pack(anchor='center')
    
    def _bind_events(self):
        """Привязываем события мыши"""
        # Перетаскивание
        self.canvas.bind('<Button-1>', self._on_drag_start)
        self.label_frame.bind('<Button-1>', self._on_drag_start)
        self.percent_label.bind('<Button-1>', self._on_drag_start)
        self.provider_label.bind('<Button-1>', self._on_drag_start)
        
        self.canvas.bind('<B1-Motion>', self._on_drag_motion)
        self.label_frame.bind('<B1-Motion>', self._on_drag_motion)
        self.percent_label.bind('<B1-Motion>', self._on_drag_motion)
        self.provider_label.bind('<B1-Motion>', self._on_drag_motion)
        
        # Открытие по двойному клику
        self.canvas.bind('<Double-Button-1>', lambda e: self._open_main())
        self.label_frame.bind('<Double-Button-1>', lambda e: self._open_main())
        self.percent_label.bind('<Double-Button-1>', lambda e: self._open_main())
        self.provider_label.bind('<Double-Button-1>', lambda e: self._open_main())
        
        # Обновление при изменении размера
        self.bind('<Configure>', self._on_resize)
    
    def _on_drag_start(self, event):
        """Начало перетаскивания"""
        self._drag_data = {'x': event.x, 'y': event.y}
    
    def _on_drag_motion(self, event):
        """Перетаскивание"""
        delta_x = event.x - self._drag_data['x']
        delta_y = event.y - self._drag_data['y']
        
        new_x = self.winfo_x() + delta_x
        new_y = self.winfo_y() + delta_y
        
        self.geometry(f"+{new_x}+{new_y}")
    
    def _on_resize(self, event):
        """Обработка изменения размера"""
        pass  # Размер фиксирован
    
    def _animate_in(self):
        """Анимация появления (fade-in)"""
        self.attributes('-alpha', 0.0)
        
        steps = 15
        for i in range(steps + 1):
            alpha = i / steps
            self.after(i * 20, lambda a=alpha: self.attributes('-alpha', a))
    
    def update_percentage(self, percentage, provider=None):
        """Обновляем процент и провайдера"""
        self.percentage = percentage
        if provider:
            self.provider = provider
        
        self.percent_label.configure(text=f"{self.percentage}%")
        self.provider_label.configure(text=self.provider)
    
    def _open_main(self):
        """Открываем главное окно"""
        if hasattr(self, '_open_main_callback'):
            self._open_main_callback()
    
    def set_open_callback(self, callback):
        """Устанавливаем колбэк для открытия главного окна"""
        self._open_main_callback = callback
