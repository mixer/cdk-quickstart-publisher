import { readFile, stat, writeFile, createReadStream, createWriteStream } from 'fs';
import { ncp } from 'ncp';

import { Callback, mapAll } from './common';

export interface IIncludeBehavior {
  paths: string[];
  action: 'include';
}

export interface IIncludeFromBehavior {
  path: string;
  fromPath: string;
  action: 'includeFrom';
}

export interface IRewriteBehavior {
  path: string;
  action: 'rewrite';
  fn: (data: string) => string;
}

export type Behavior = IIncludeBehavior | IRewriteBehavior | IIncludeFromBehavior;

export interface IBehaviorContext<T> {
  basePath: string;
  stagingPath: string;
  def: T;
}

/**
 * Copies a file.
 */
function copyFile(src: string, dest: string, callback: Callback) {
  createReadStream(src)
    .pipe(createWriteStream(dest))
    .on('close', () => callback(null))
    .on('error', err => callback(err));
}

export const behaviors = {
  include: (opts: IBehaviorContext<IIncludeBehavior>, callback: Callback) => {
    mapAll(
      opts.def.paths,
      (path, callback) =>
        stat(path, (err, stats) => {
          if (err) {
            return callback(err);
          }

          if (stats.isDirectory()) {
            ncp(`${opts.basePath}/${path}`, `${opts.stagingPath}/${path}`, callback);
          } else {
            copyFile(`${opts.basePath}/${path}`, `${opts.stagingPath}/${path}`, callback);
          }
        }),
      callback,
    );
  },
  includeFrom: (opts: IBehaviorContext<IIncludeFromBehavior>, callback: Callback) => {
    copyFile(
      `${opts.basePath}/${opts.def.fromPath}`,
      `${opts.stagingPath}/${opts.def.path}`,
      callback,
    );
  },
  rewrite: (opts: IBehaviorContext<IRewriteBehavior>, callback: Callback) => {
    readFile(`${opts.basePath}/${opts.def.path}`, 'utf-8', (err, contents) => {
      if (err) {
        return callback(err);
      }

      writeFile(`${opts.stagingPath}/${opts.def.path}`, opts.def.fn(contents), callback);
    });
  },
};
