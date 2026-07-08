import re
from dataclasses import dataclass, field
from typing import Self

from lxml import etree


def _obtain(elem: etree._Element, tag: str) -> list[str]:
    """Получить содержимое набора одноимённых тегов
    внутри указанного элемента XML как список строк.
    """
    return [
        elem.text 
        for elem in elem.findall(tag)
        if elem.text is not None
    ]

@dataclass(slots=True)
class Phrase:
    _id: str
    text: str | None = None
    _next: list[str] = field(default_factory=list)
    has_info: list[str] = field(default_factory=list)
    dont_has_info: list[str] = field(default_factory=list)
    precondition: list[str] = field(default_factory=list)
    give_info: list[str] = field(default_factory=list)
    action: list[str] = field(default_factory=list)
    meta_pos: tuple[int, int] | None = None

    class ElementError(Exception):
        """Исключение, вызываемое при ошибке конструирования по элементу XML.
        """
        pass

    @classmethod
    def from_elem(cls: type[Self], elem: etree._Element) -> Self:
        """Конструктор экземпляра класса по элементу XML.
        """
        if (phrase_id := elem.get("id")):
            phrase = cls(phrase_id)

            # text
            if (elem_text := elem.find("text")) is not None:
                phrase.text = elem_text.text
            
            # next phrases
            phrase._next = _obtain(elem, "next")

            # conditions
            phrase.has_info = _obtain(elem, "has_info")
            phrase.dont_has_info = _obtain(elem, "dont_has_info")
            phrase.precondition = _obtain(elem, "precondition")

            # actions
            phrase.give_info = _obtain(elem, "give_info")
            phrase.action = _obtain(elem, "action")

            # Метаданные о координатах фразы для отрисовки
            for cmt in elem.iter(etree.Comment):
                if cmt.text is not None:
                    txt = "".join(cmt.text.split())

                    # old format support (iP Dialog Manager v2.0)
                    if (m := re.fullmatch(r"ipX(\d+)ipY(\d+)", txt)):
                        phrase.meta_pos = (int(m.group(1)), int(m.group(2)))
                        break

                    # new format
                    pattern = r"x[\:=]([-+]?\d+)[,;]y[\:=]([-+]?\d+)"
                    if (m := re.match(pattern, txt, flags=re.IGNORECASE)):
                        phrase.meta_pos = (int(m.group(1)), int(m.group(2)))
                        break

            return phrase
        else:
            raise cls.ElementError

@dataclass(slots=True)
class Dialog:
    _id: str
    has_info: list[str] = field(default_factory=list)
    dont_has_info: list[str] = field(default_factory=list)
    precondition: list[str] = field(default_factory=list)
    phrases: dict[str, Phrase] = field(default_factory=dict)

    _warnings: list[str] = field(default_factory=list)
    """Сообщения о некритических ошибках на этапе инициализации."""

    class ElementError(Exception):
        """Исключение, вызываемое при ошибке конструирования по элементу XML.
        """
        pass

    @classmethod
    def from_elem(cls: type[Self], elem: etree._Element) -> Self:
        """Конструктор экземпляра класса по элементу XML.
        """
        if (dialog_id := elem.get("id")):
            dialog = cls(dialog_id)

            # conditions
            dialog.has_info = _obtain(elem, "has_info")
            dialog.dont_has_info = _obtain(elem, "dont_has_info")
            dialog.precondition = _obtain(elem, "precondition")

            # phrases
            if (phrase_list := elem.find("phrase_list")) is not None:
                for elem_phrase in phrase_list.findall("phrase"):
                    try:
                        phrase = Phrase.from_elem(elem_phrase)
                        if phrase._id in dialog.phrases:
                            dialog._warnings.append(
                                f"Проигнорирована фраза с дубликатом id '{phrase._id}'"
                                f" (строка: {elem_phrase.sourceline})"
                            )
                        else:
                            dialog.phrases[phrase._id] = phrase
                    except Phrase.ElementError:
                        dialog._warnings.append(
                            f"Не удалось обработать элемент <{elem_phrase.tag}>"
                            f" (строка: {elem_phrase.sourceline})"
                        )
                
            # Проверка связей между фразами
            for phr in dialog.phrases.values():
                invalid_next = False
                for next_phr_id in phr._next:
                    if next_phr_id not in dialog.phrases:
                        invalid_next = True
                        dialog._warnings.append(
                            f"Связь '{phr._id}' -> '{next_phr_id}' проигнорирована: "
                            f"фразы '{next_phr_id}' не существует"
                        )
                if invalid_next:
                    phr._next = [n for n in phr._next if n in dialog.phrases]

            return dialog
        else:
            raise cls.ElementError

class GameDialogs:
    """Класс с набором диалогов, считывающимся с xml-файла.
    """
    dialogs: dict[str, Dialog]

    _warnings: list[str]
    """Сообщения о некритических ошибках на этапе инициализации."""

    def __init__(self, raw_xml: str):
        self.dialogs = {}
        self._warnings = []

        # include-директивы не поддерживаются
        lines_xml = raw_xml.splitlines()
        lines_to_omit: set[int] = {
            i
            for i, line in enumerate(lines_xml)
            if line.strip().startswith("#include")
        }
        if len(lines_to_omit) > 0:
            raw_xml = "\n".join(
                [line for i, line in enumerate(lines_xml) if i not in lines_to_omit]
            )
            self._warnings.append("Строки с include-директивами были проигнорированы")

        # Парсинг
        root = etree.fromstring(raw_xml.encode(encoding="utf-8"))
        for elem_dialog in root.findall("dialog"):
            try:
                dialog = Dialog.from_elem(elem_dialog)
                if dialog._id in self.dialogs:
                    self._warnings.append(
                        f"Проигнорирован диалог с дубликатом id '{dialog._id}'"
                        f" (строка: {elem_dialog.sourceline})"
                    )
                else:
                    self.dialogs[dialog._id] = dialog
            except Dialog.ElementError:
                self._warnings.append(
                    f"Не удалось обработать элемент <{elem_dialog.tag}>"
                    f" (строка: {elem_dialog.sourceline})"
                )
