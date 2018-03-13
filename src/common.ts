export type Callback = (err: Error | null | void) => void;

/**
 * Using the iterator that takes a `thing` and callback, returns a callback
 * that fires once all things are finished.
 */
export function mapAll<T>(
  things: T[],
  iterator: (thing: T, callback: Callback) => void,
  callback: Callback,
) {
  if (things.length === 0) {
    return callback(null);
  }

  let todo = things.length;
  things.forEach(thing => {
    iterator(thing, err => {
      if (err) {
        todo = -1;
        callback(err);
      } else if (--todo === 0) {
        callback(null);
      }
    });
  });
}
