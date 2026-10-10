/**
 * Estado en memoria del servidor y su revisión.
 *
 * `dispatch` calcula el estado nuevo, lo guarda y solo después lo publica:
 * si el reducer o el guardado fallan, el estado y la revisión anteriores
 * quedan intactos y el error sube a quien llamó. Así `GET /api/state` nunca
 * muestra un cambio que no está en disco.
 */
export function createStateStore({ initialState, reducer, save }) {
  let state = initialState;
  let revision = 1;

  return {
    getState: () => state,
    getRevision: () => revision,
    dispatch(action) {
      const nextState = reducer(state, action);
      save(nextState);
      state = nextState;
      revision += 1;
      return state;
    },
  };
}
