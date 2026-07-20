import { create } from 'zustand';

const useSampleStore = create(
  (set, get) => ({
    phraseSample: null,
    isLoadingPhraseSample: false,

    // Загрузить с сервера объект шаблонной вершины.
    loadPhraseSample: async () => {
      if (!!get().phraseSample || get().isLoadingPhraseSample) return;
      set({ isLoadingPhraseSample: true });
      try {
        const response = await fetch('http://127.0.0.1:8000/api/dialogs/phrase-sample');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || `Ошибка сервера: ${response.status}`;
          throw new Error(errorMessage);
        }
        const result = await response.json();
        if (!result.data) {
          throw new Error('Ответ сервера получен, но данных о фразе нет');
        }
        set({ phraseSample: result.data });
      } catch (error) {
        console.error(error);
      } finally {
        set({ isLoadingPhraseSample: false });
      }
    },

  })
);

export default useSampleStore;
