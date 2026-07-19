import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { message } from 'antd';

import useSampleStore from '@/store/useSampleStore';

let duplicatePhraseIDsCache = {};
let afterNodeIDsCache = {};

const useGameDialogsStore = create(
  subscribeWithSelector(
    immer((set, get) => ({
      gameDialogs: null,
      setGameDialogs: (gameDialogs) => {
        set({ gameDialogs });
      },

      selectedDialogID: null,
      setSelectedDialogID: (selectedDialogID) => {
        set({ selectedDialogID });
      },

      selectedNodeID: null,
      setSelectedNodeID: (selectedNodeID) => {
        set({ selectedNodeID });
      },

      getNode: (dialogID, nodeID) => {
        return get().gameDialogs?.dialogs?.find(d => d.id === dialogID)?.nodes?.find(n => n.id === nodeID);
      },
      getNodes: (dialogID) => {
        return get().gameDialogs?.dialogs?.find(d => d.id === dialogID)?.nodes;
      },
      getEdges: (dialogID) => {
        return get().gameDialogs?.dialogs?.find(d => d.id === dialogID)?.edges;
      },

      updatePhrasesPositions: (dialogID, newPositionsMap) => {
        if (!!dialogID && !!newPositionsMap) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              for (const [phrID, newPosition] of newPositionsMap) {
                const phr = dlg.nodes?.find(n => n.id === phrID);
                if (phr) {
                  phr.position = {...newPosition};
                }
              }
            }
          });
        }
      },

      updatePhrase: (dialogID, phrase) => {
        if (!!dialogID && !!phrase) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              const idx = dlg.nodes?.findIndex(n => n.id === phrase.id);
              if (idx >= 0) {
                dlg.nodes[idx] = phrase;
              }
            }
          });
        }
      },

      deletePhrases: (dialogID, nodesIDSet) => {
        if (!!dialogID && !!nodesIDSet) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              dlg.edges = dlg.edges?.filter(e => !nodesIDSet.has(e.target) && !nodesIDSet.has(e.source)) || [];
              dlg.nodes = dlg.nodes?.filter(n => !nodesIDSet.has(n.id)) || [];
            }
          });
        }
      },

      addPhraseConnection: (dialogID, sourceID, targetID) => {
        if (!!sourceID && !!targetID) {
          const sample = useSampleStore.getState().edgeSample;
          if (!sample) {
            message.error('Ошибка при создании связи между фразами!');
            return;
          }
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              if (!dlg.edges.some(e => (e.source === sourceID) && (e.target === targetID))) {
                const newEdge = structuredClone(sample);
                newEdge.id = `e_${sourceID}_${targetID}`;
                newEdge.source = sourceID;
                newEdge.target = targetID;
                dlg.edges.push(newEdge);
              }
            }
          });
        }
      },

      delPhraseConnection: (dialogID, sourceID, targetID) => {
        if (!!dialogID && !!sourceID && !!targetID) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              dlg.edges = dlg.edges?.filter(e => (e.source !== sourceID) || (e.target !== targetID));
            }
          });
        }
      },

      deletePhrasesConnections: (dialogID, edgesIDSet) => {
        if (!!dialogID && !!edgesIDSet) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              dlg.edges = dlg.edges?.filter(e => !edgesIDSet.has(e.id)) || [];
            }
          });
        }
      },

      // Создать новую фразу для указанного диалога.
      // Возвращает ID созданной фразы или null при ошибке.
      createPhrase: (dialogID, position) => {
        if (!!dialogID) {
          const sample = useSampleStore.getState().phraseSample;
          if (!sample) {
            message.error('Ошибка при создании фразы!');
            return null;
          }
          let newPhraseID = null;
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.find(d => d.id === dialogID);
            if (dlg) {
              // Генерация нового ID.
              const nodeIDs = new Set();
              const phraseIDs = new Set();
              dlg.nodes.forEach(n => {
                nodeIDs.add(n.id);
                phraseIDs.add(n.data.phrase_id);
              });
              let i = 0;
              while (true) {
                newPhraseID = `new${i}`;
                if (nodeIDs.has(newPhraseID) || phraseIDs.has(newPhraseID)) {
                  i += 1;
                } else {
                  break;
                }
              }

              // Вычисление координат.
              if (!position) {
                let sumX = 0, sumY = 0;
                for (const node of dlg.nodes) {
                  if (!!node.position?.x && !!node.position?.y) {
                    sumX += node.position.x;
                    sumY += node.position.y;
                  }
                }
                position = {
                  x: sumX / dlg.nodes.length,
                  y: sumY / dlg.nodes.length,
                };
              }

              // Добавление фразы.
              const newPhrase = structuredClone(sample);
              newPhrase.id = newPhraseID;
              newPhrase.data.phrase_id = newPhraseID;
              newPhrase.position = { ...position };
              dlg.nodes.push(newPhrase);
            }
          });
          return newPhraseID;
        }
      },

      // Получить массив дубликатов пользовательских ID (node.data.phrase_id).
      // Результат вычисления кэшируется.
      getDuplicatePhraseIDs: (dialogID) => {
        if (!dialogID) {
          return [];
        }
        if (duplicatePhraseIDsCache[dialogID]) {
          return duplicatePhraseIDsCache[dialogID];
        }
        const dialogNodes = get().gameDialogs?.dialogs?.find(d => d.id === dialogID)?.nodes;
        if (!dialogNodes) {
          return [];
        }
        const countsMap = dialogNodes.reduce((acc, node) => {
          const phraseID = node?.data?.phrase_id;
          if (phraseID) {
            acc.set(phraseID, (acc.get(phraseID) || 0) + 1);
          }
          return acc;
        }, new Map());
        duplicatePhraseIDsCache[dialogID] = Array.from(countsMap).flatMap(([phrID, cnt]) => (cnt > 1) ? [phrID] : []);
        return duplicatePhraseIDsCache[dialogID];
      },

      // Получить массив ID вершин, следующих после указанной (node.id).
      // Результат вычисления кэшируется.
      getAfterNodeIDsCache: (dialogID, nodeID) => {
        if (!dialogID || !nodeID) {
          return [];
        }
        if (afterNodeIDsCache[dialogID]?.[nodeID]) {
          return afterNodeIDsCache[dialogID][nodeID];
        }
        const dialogEdges = get().gameDialogs?.dialogs?.find(d => d.id === dialogID)?.edges;
        if (!dialogEdges) {
          return [];
        }
        if (!afterNodeIDsCache[dialogID]) {
          afterNodeIDsCache[dialogID] = {};
        }
        afterNodeIDsCache[dialogID][nodeID] = dialogEdges.flatMap(e => (e.source === nodeID) ? [e.target] : []);
        return afterNodeIDsCache[dialogID][nodeID];
      },

    }))
  )
);

// Сброс кэшей при обновлении данных о диалогах.
useGameDialogsStore.subscribe(
  (state) => state.gameDialogs,
  () => {
    duplicatePhraseIDsCache = {};
    afterNodeIDsCache = {};
  }
);

export default useGameDialogsStore;
