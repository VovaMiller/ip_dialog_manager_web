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
        return get().gameDialogs?.dialogs?.[dialogID]?.nodes?.[nodeID];
      },
      getNodes: (dialogID) => {
        return get().gameDialogs?.dialogs?.[dialogID]?.nodes;
      },
      getEdge: (dialogID, edgeID) => {
        return get().gameDialogs?.dialogs?.[dialogID]?.edges?.[edgeID];
      },
      getEdges: (dialogID) => {
        return get().gameDialogs?.dialogs?.[dialogID]?.edges;
      },

      getReactFlowNodes: (dialogID) => {
        return Object.keys(get().getNodes(dialogID) || {}).map(nodeId => {
          const node = get().getNode(dialogID, nodeId);
          return {
            id: nodeId,
            position: {
                x: node?.posX || 0,
                y: node?.posY || 0,
            },
            type: 'phraseNode',
          };
        });
      },
      getReactFlowEdges: (dialogID) => {
        return Object.keys(get().getEdges(dialogID) || {}).map(edgeId => {
          const edge = get().getEdge(dialogID, edgeId);
          return {
            id: edgeId,
            type: 'straight',
            source: edge?.source,
            target: edge?.target,
            animated: false,
            markerEnd: {
                type: 'arrow',
                // color: '#1890ff',
                width: 20,
                height: 20,
            },
          };
        });
      },

      updatePhrasesPositions: (dialogID, newPositionsMap) => {
        if (!!dialogID && !!newPositionsMap) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.[dialogID];
            if (dlg) {
              for (const [phrID, newPosition] of newPositionsMap) {
                const phr = dlg.nodes?.[phrID];
                if (phr) {
                  phr.posX = newPosition.x || 0;
                  phr.posY = newPosition.y || 0;
                }
              }
            }
          });
        }
      },

      updatePhrase: (dialogID, phrase) => {
        if (!!dialogID && !!phrase) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.[dialogID];
            if (!!dlg && !!dlg.nodes) {
              dlg.nodes[phrase.id] = phrase;
            }
          });
        }
      },

      deletePhrases: (dialogID, nodesIDSet) => {
        if (!!dialogID && !!nodesIDSet) {
          set(state => {
            const dlg = state.gameDialogs?.dialogs?.[dialogID];
            if (dlg) {
              if (dlg.edges) {
                Object.keys(dlg.edges).forEach(edgeId => {
                  if (nodesIDSet.has(dlg.edges[edgeId].target) || nodesIDSet.has(dlg.edges[edgeId].source)) {
                    delete dlg.edges[edgeId];
                  }
                });
              }
              if (dlg.nodes) {
                Object.keys(dlg.nodes).forEach(nodeId => {
                  if (nodesIDSet.has(nodeId)) {
                    delete dlg.nodes[nodeId];
                  }
                });
              }
            }
          });
        }
      },

      addPhraseConnection: (dialogID, sourceID, targetID) => {
        if (!!sourceID && !!targetID) {
          set(state => {
            const dlgEdges = state.gameDialogs?.dialogs?.[dialogID]?.edges;
            if (dlgEdges) {
              const connectionExists = Object.keys(dlgEdges).some(
                edgeId => (dlgEdges[edgeId].source === sourceID) && (dlgEdges[edgeId].target === targetID)
              );
              if (!connectionExists) {
                const newEdgeId = `e_${sourceID}_${targetID}`;
                dlgEdges[newEdgeId] = {
                  id: newEdgeId,
                  source: sourceID,
                  target: targetID,
                };
              }
            }
          });
        }
      },

      delPhraseConnection: (dialogID, sourceID, targetID) => {
        if (!!dialogID && !!sourceID && !!targetID) {
          set(state => {
            const dlgEdges = state.gameDialogs?.dialogs?.[dialogID]?.edges;
            if (dlgEdges) {
              Object.keys(dlgEdges).forEach(edgeId => {
                if ((dlgEdges[edgeId].source === sourceID) && (dlgEdges[edgeId].target === targetID)) {
                  delete dlgEdges[edgeId];
                }
              });
            }
          });
        }
      },

      deletePhrasesConnections: (dialogID, edgesIDSet) => {
        if (!!dialogID && !!edgesIDSet) {
          set(state => {
            const dlgEdges = state.gameDialogs?.dialogs?.[dialogID]?.edges;
            if (dlgEdges) {
              Object.keys(dlgEdges).forEach(edgeId => {
                if (edgesIDSet.has(edgeId)) {
                  delete dlgEdges[edgeId];
                }
              });
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
            const dlg = state.gameDialogs?.dialogs?.[dialogID];
            if (dlg) {
              // Генерация нового ID.
              const nodeIDs = new Set();
              const phraseIDs = new Set();
              Object.keys(dlg.nodes).forEach(nodeId => {
                nodeIDs.add(nodeId);
                phraseIDs.add(dlg.nodes[nodeId].phraseId);
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
                let nodesCnt = 0;
                Object.keys(dlg.nodes).forEach(nodeId => {
                  sumX += dlg.nodes[nodeId].posX || 0;
                  sumY += dlg.nodes[nodeId].posY || 0;
                  nodesCnt += 1;
                });
                position = {
                  x: sumX / nodesCnt,
                  y: sumY / nodesCnt,
                };
              }

              // Добавление фразы.
              const newPhrase = structuredClone(sample);
              newPhrase.id = newPhraseID;
              newPhrase.posX = position.x || 0;
              newPhrase.posY = position.y || 0;
              newPhrase.phraseId = newPhraseID;
              dlg.nodes[newPhraseID] = newPhrase;
            }
          });
          return newPhraseID;
        }
      },

      // Получить массив дубликатов пользовательских ID (node.phraseId).
      // Результат вычисления кэшируется.
      getDuplicatePhraseIDs: (dialogID) => {
        if (!dialogID) {
          return [];
        }
        if (duplicatePhraseIDsCache[dialogID]) {
          return duplicatePhraseIDsCache[dialogID];
        }
        const dialogNodes = get().gameDialogs?.dialogs?.[dialogID]?.nodes;
        if (!dialogNodes) {
          return [];
        }
        const countsMap = Object.keys(dialogNodes).reduce((acc, nodeId) => {
          const phraseID = dialogNodes[nodeId].phraseId;
          if (phraseID) {
            acc.set(phraseID, (acc.get(phraseID) || 0) + 1);
          }
          return acc;
        }, new Map());
        duplicatePhraseIDsCache[dialogID] = Array.from(countsMap).flatMap(([phrID, cnt]) => (cnt > 1) ? [phrID] : []);
        return duplicatePhraseIDsCache[dialogID];
      },

      // Получить массив ID вершин (node.id), следующих после указанной.
      // Результат вычисления кэшируется.
      getAfterNodeIDsCache: (dialogID, nodeID) => {
        if (!dialogID || !nodeID) {
          return [];
        }
        if (afterNodeIDsCache[dialogID]?.[nodeID]) {
          return afterNodeIDsCache[dialogID][nodeID];
        }
        const dialogEdges = get().gameDialogs?.dialogs?.[dialogID]?.edges;
        if (!dialogEdges) {
          return [];
        }
        if (!afterNodeIDsCache[dialogID]) {
          afterNodeIDsCache[dialogID] = {};
        }
        afterNodeIDsCache[dialogID][nodeID] = Object.keys(dialogEdges).flatMap(
          edgeId => (dialogEdges[edgeId].source === nodeID) ? [dialogEdges[edgeId].target] : []
        );
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
