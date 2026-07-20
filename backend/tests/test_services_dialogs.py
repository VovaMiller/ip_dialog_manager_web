from pathlib import Path
from typing import cast

import pytest
from lxml import etree

from app.services.dialogs import Dialog, GameDialogs, Phrase


def _read_elem(raw_xml: str, tag: str) -> etree._Element:
    root = etree.fromstring(raw_xml.encode(encoding="utf-8"))
    return cast(etree._Element, root.find(tag))

# ----------------------------------------------------------------

def test_phrase_constructor_basic():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <has_info>info_1</has_info>
                <dont_has_info>info_2</dont_has_info>
                <precondition>script.precond</precondition>
                <text>phrase_0_text</text>
                <give_info>info_3</give_info>
                <action>script.func</action>
                <next>1</next>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text == "phrase_0_text"
    assert phrase._next == ["1"]
    assert phrase.has_info == ["info_1"]
    assert phrase.dont_has_info == ["info_2"]
    assert phrase.precondition == ["script.precond"]
    assert phrase.give_info == ["info_3"]
    assert phrase.action == ["script.func"]
    assert phrase.meta_pos is None

def test_phrase_constructor_empty_phrase():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <text />
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text is None
    assert phrase._next == []
    assert phrase.has_info == []
    assert phrase.dont_has_info == []
    assert phrase.precondition == []
    assert phrase.give_info == []
    assert phrase.action == []
    assert phrase.meta_pos is None

def test_phrase_constructor_no_text_1():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <text />
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text is None

def test_phrase_constructor_no_text_2():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <text></text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text is None

def test_phrase_constructor_no_text_3():
    raw_xml = """
        <phrase_list>
            <phrase id="0" />
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text is None

def test_phrase_constructor_multiple_tags():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <has_info>info_1</has_info>
                <has_info>info_2</has_info>
                <text>phrase_0_text</text>
                <action>script.func_1</action>
                <action>script.func_2</action>
                <next>1</next>
                <next>2</next>
                <next>3</next>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text == "phrase_0_text"
    assert phrase.has_info == ["info_1", "info_2"]
    assert phrase.action == ["script.func_1", "script.func_2"]
    assert phrase._next == ["1", "2", "3"]

def test_phrase_constructor_without_id():
    raw_xml = """
        <phrase_list>
            <phrase>
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    with pytest.raises(Phrase.ElementError):
        _ = Phrase.from_elem(_read_elem(raw_xml, "phrase"))

def test_phrase_constructor_position_old_format():
    raw_xml = """
        <phrase_list>
            <phrase id="0"> <!--ipX150ipY50-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase._id == "0"
    assert phrase.text == "phrase_0_text"
    assert phrase.meta_pos == (150, 50)

def test_phrase_constructor_position_01():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:10,y:20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_02():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:10;y:20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_03():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x=10,y=20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_04():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x=10;y=20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_05_spaces():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!-- x : 10 , y : 20 -->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_06_uppercase():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--X:10,Y:20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_07_positive():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:+10,y:+20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, 20)

def test_phrase_constructor_position_08_negative():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:-10,y:-20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (-10, -20)

def test_phrase_constructor_position_09_mixed():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:10; Y = -20-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos == (10, -20)

def test_phrase_constructor_position_10_invalid():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:10-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos is None

def test_phrase_constructor_position_11_invalid():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x:lO,y:lO-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos is None

def test_phrase_constructor_position_12_invalid():
    raw_xml = """
        <phrase_list>
            <phrase id="0">
                <!--x: - -1,y:2-->
                <text>phrase_0_text</text>
            </phrase>
        </phrase_list>
    """
    phrase = Phrase.from_elem(_read_elem(raw_xml, "phrase"))
    assert phrase.meta_pos is None

# ----------------------------------------------------------------

def test_dialog_constructor_basic():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <has_info>info_1</has_info>
                <dont_has_info>info_2</dont_has_info>
                <precondition>script.precond</precondition>
                <phrase_list>
                    <phrase id="0">
                        <text>phrase_0_text</text>
                        <next>1</next>
                    </phrase>
                    <phrase id="1">
                        <text>phrase_1_text</text>
                    </phrase>
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert dialog.has_info == ["info_1"]
    assert dialog.dont_has_info == ["info_2"]
    assert dialog.precondition == ["script.precond"]
    assert len(dialog.phrases) == 2
    assert dialog.phrases["0"].text == "phrase_0_text"
    assert dialog.phrases["0"]._next == ["1"]
    assert dialog.phrases["1"].text == "phrase_1_text"
    assert dialog.phrases["1"]._next == []

def test_dialog_constructor_empty_dialog_1():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <phrase_list>
                    <!-- no phrases -->
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert dialog.has_info == []
    assert dialog.dont_has_info == []
    assert dialog.precondition == []
    assert len(dialog.phrases) == 0

def test_dialog_constructor_empty_dialog_2():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <!-- no phrases -->
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert dialog.has_info == []
    assert dialog.dont_has_info == []
    assert dialog.precondition == []
    assert len(dialog.phrases) == 0

def test_dialog_constructor_multiple_tags():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <has_info>info_1</has_info>
                <has_info>info_2</has_info>
                <has_info>info_3</has_info>
                <dont_has_info>info_4</dont_has_info>
                <dont_has_info>info_5</dont_has_info>
                <precondition>script.precond</precondition>
                <phrase_list>
                    <!-- no phrases -->
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert dialog.has_info == ["info_1", "info_2", "info_3"]
    assert dialog.dont_has_info == ["info_4", "info_5"]
    assert dialog.precondition == ["script.precond"]

def test_dialog_constructor_without_id():
    raw_xml = """
        <game_dialogs>
            <dialog>
                <phrase_list>
                    <phrase id="0">
                        <text>phrase_0_text</text>
                    </phrase>
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    with pytest.raises(Dialog.ElementError):
        _ = Dialog.from_elem(_read_elem(raw_xml, "dialog"))

def test_dialog_constructor_invalid_next():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <phrase_list>
                    <phrase id="0">
                        <next>1</next>
                        <next>2</next>
                        <next>3</next>
                    </phrase>
                    <phrase id="2">
                        <next>20</next>
                    </phrase>
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert len(dialog.phrases) == 2
    assert "0" in dialog.phrases
    assert dialog.phrases["0"]._next == ["2"]
    assert "2" in dialog.phrases
    assert dialog.phrases["2"]._next == []

def test_dialog_constructor_duplicate_phrase():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <phrase_list>
                    <phrase id="0">
                        <text>text_0</text>
                    </phrase>
                    <phrase id="0">
                        <text>text_1</text>
                    </phrase>
                    <phrase id="0">
                        <text>text_2</text>
                    </phrase>
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    dialog = Dialog.from_elem(_read_elem(raw_xml, "dialog"))
    assert dialog._id == "dialog_1"
    assert len(dialog.phrases) == 1
    assert "0" in dialog.phrases
    assert dialog.phrases["0"].text == "text_0"

# ----------------------------------------------------------------

def test_game_dialogs_constructor_basic():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <!-- dialog_1 -->
            </dialog>
            <dialog id="dialog_2">
                <!-- dialog_2 -->
            </dialog>
            <dialog id="dialog_3">
                <!-- dialog_3 -->
            </dialog>
            <dialog>
                <!-- invalid -->
            </dialog>
        </game_dialogs>
    """
    game_dialogs = GameDialogs(raw_xml)
    assert len(game_dialogs.dialogs) == 3
    assert "dialog_1" in game_dialogs.dialogs
    assert "dialog_2" in game_dialogs.dialogs
    assert "dialog_3" in game_dialogs.dialogs

def test_game_dialogs_constructor_include():
    raw_xml = """
        <game_dialogs>
            #include "gameplay\\dialogs_extra_1.xml"
            <dialog id="dialog_1">
                <!-- dialog_1 -->
            </dialog>
            #include "gameplay\\dialogs_extra_2.xml"
            <dialog id="dialog_2">
                <!-- dialog_2 -->
            </dialog>
            #include "gameplay\\dialogs_extra_3.xml"
            #include "gameplay\\dialogs_extra_4.xml"
        </game_dialogs>
    """
    game_dialogs = GameDialogs(raw_xml)
    assert len(game_dialogs.dialogs) == 2
    assert "dialog_1" in game_dialogs.dialogs
    assert "dialog_2" in game_dialogs.dialogs

def test_game_dialogs_constructor_duplicate_dialog():
    raw_xml = """
        <game_dialogs>
            <dialog id="dialog_1">
                <phrase_list>
                    <phrase id="0" />
                </phrase_list>
            </dialog>
            <dialog id="dialog_1">
                <phrase_list>
                    <phrase id="1" />
                </phrase_list>
            </dialog>
            <dialog id="dialog_1">
                <phrase_list>
                    <phrase id="2" />
                </phrase_list>
            </dialog>
        </game_dialogs>
    """
    game_dialogs = GameDialogs(raw_xml)
    assert len(game_dialogs.dialogs) == 1
    assert (dlg := game_dialogs.dialogs.get("dialog_1")) is not None
    assert len(dlg.phrases) == 1
    assert "0" in dlg.phrases

def test_game_dialogs_constructor_complete_dialog_check():
    script_path = Path(__file__)
    file_path = script_path.parent / script_path.stem / "dialogs_escape.xml"
    game_dialogs = GameDialogs(file_path.read_text(encoding="cp1251"))
    dlg = game_dialogs.dialogs["escape_lager_volk_talk"]

    assert dlg.has_info == []
    assert dlg.dont_has_info == []
    assert dlg.precondition == []
    assert len(dlg.phrases) == 31

    assert (phr := dlg.phrases.get("111111121")) is not None
    assert phr.text == "escape_lager_volk_talk_111111121"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("111111112")) is not None
    assert phr.text == "escape_lager_volk_talk_111111112"
    assert phr._next == ["111111121"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("1111")) is not None
    assert phr.text == "escape_lager_volk_talk_1111"
    assert phr._next == ["11111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("1111111")) is not None
    assert phr.text == "escape_lager_volk_talk_1111111"
    assert phr._next == ["11111111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("11111111")) is not None
    assert phr.text == "escape_lager_volk_talk_11111111"
    assert phr._next == ["111111111", "111111112"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("111111111")) is not None
    assert phr.text == "escape_lager_volk_talk_111111111"
    assert phr._next == ["1111111111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == ["esc_kill_bandits_quest_have"]
    assert phr.action == []

    assert (phr := dlg.phrases.get("1111111111")) is not None
    assert phr.text == "escape_lager_volk_talk_1111111111"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == ["escape_dialog.give_weapon_to_actor"]

    assert (phr := dlg.phrases.get("21211")) is not None
    assert phr.text == "escape_lager_volk_talk_21211"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("511")) is not None
    assert phr.text == "escape_lager_volk_talk_511"
    assert phr._next == ["5111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("5111")) is not None
    assert phr.text == "escape_lager_volk_talk_5111"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == ["esc_kill_bandits_quest_done"]
    assert phr.action == ["escape_dialog.wolf_additional_reward"]

    assert (phr := dlg.phrases.get("51")) is not None
    assert phr.text == "escape_lager_volk_talk_51"
    assert phr._next == ["511"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("0")) is not None
    assert phr.text is None
    assert phr._next == ["1", "2", "3", "4", "5"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("11")) is not None
    assert phr.text == "escape_lager_volk_talk_11"
    assert phr._next == ["111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("111")) is not None
    assert phr.text == "escape_lager_volk_talk_111"
    assert phr._next == ["1111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("111111")) is not None
    assert phr.text == "escape_lager_volk_talk_111111"
    assert phr._next == ["1111111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("11111")) is not None
    assert phr.text == "escape_lager_volk_talk_11111"
    assert phr._next == ["111111"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("3")) is not None
    assert phr.text is None
    assert phr._next == ["31"]
    assert phr.has_info == []
    assert phr.dont_has_info == ["tutorial_wounded_start"]
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("31")) is not None
    assert phr.text == "escape_lager_volk_talk_31"
    assert phr._next == ["311"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("311")) is not None
    assert phr.text == "escape_lager_volk_talk_311"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == ["dialogs.break_dialog"]

    assert (phr := dlg.phrases.get("5")) is not None
    assert phr.text is None
    assert phr._next == ["51"]
    assert phr.has_info == []
    assert phr.dont_has_info == ["esc_kill_bandits_quest_done", "esc_bandits_start"]
    assert phr.precondition == ["escape_dialog.bandits_die"]
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("21")) is not None
    assert phr.text == "escape_lager_volk_talk_21"
    assert phr._next == ["211", "212", "213"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("2111")) is not None
    assert phr.text == "escape_lager_volk_talk_2111"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == ["esc_kill_bandits_quest_done", "esc_petruha_great"]
    assert phr.action == ["escape_dialog.transfer_wolf_reward"]

    assert (phr := dlg.phrases.get("2121")) is not None
    assert phr.text == "escape_lager_volk_talk_2121"
    assert phr._next == ["21211"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == ["esc_kill_bandits_quest_done", "esc_petruha_great"]
    assert phr.action == ["escape_dialog.transfer_wolf_reward", "escape_dialog.wolf_additional_reward"]

    assert (phr := dlg.phrases.get("2131")) is not None
    assert phr.text == "escape_lager_volk_talk_2131"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("213")) is not None
    assert phr.text == "escape_lager_volk_talk_213"
    assert phr._next == ["2131"]
    assert phr.has_info == []
    assert phr.dont_has_info == ["esc_kill_bandits_quest_kill"]
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("211")) is not None
    assert phr.text == "escape_lager_volk_talk_211"
    assert phr._next == ["2111"]
    assert phr.has_info == ["esc_bandits_start", "esc_kill_bandits_quest_kill"]
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("212")) is not None
    assert phr.text == "escape_lager_volk_talk_212"
    assert phr._next == ["2121"]
    assert phr.has_info == ["esc_kill_bandits_quest_kill"]
    assert phr.dont_has_info == ["esc_bandits_start"]
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("41")) is not None
    assert phr.text == "escape_lager_volk_talk_41"
    assert phr._next == []
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("1")) is not None
    assert phr.text is None
    assert phr._next == ["11"]
    assert phr.has_info == ["tutorial_wounded_start"]
    assert phr.dont_has_info == ["esc_kill_bandits_quest_have", "tutorial_wounded_give_info"]
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("2")) is not None
    assert phr.text is None
    assert phr._next == ["21"]
    assert phr.has_info == ["tutorial_wounded_start", "esc_kill_bandits_quest_have"]
    assert phr.dont_has_info == ["esc_kill_bandits_quest_done"]
    assert phr.precondition == []
    assert phr.give_info == []
    assert phr.action == []

    assert (phr := dlg.phrases.get("4")) is not None
    assert phr.text is None
    assert phr._next == ["41"]
    assert phr.has_info == []
    assert phr.dont_has_info == []
    assert phr.precondition == ["escape_dialog.wolf_precond_univ"]
    assert phr.give_info == []
    assert phr.action == []

# ----------------------------------------------------------------

# TODO: test Dialog.build_frontend_node
# TODO: test Dialog.get_frontend_nodes
# TODO: test Dialog.get_frontend_edges
