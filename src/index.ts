import { tmpdir } from 'os';
import * as rimraf from 'rimraf';
import { create } from 'tar';
import { mkdirSync } from 'fs';
import * as azure from 'azure-storage';
import chalk from 'chalk';

import { behaviors, Behavior } from './behaviors';
import { mapAll, Callback } from './common';

/**
 * Contract for quickstart configuration.
 */
interface IQuickstartConfig {
  name: string;
  tasks: Behavior[];
}

/**
 * Loads the quickstart configuration fron the .miix-quickstart file.
 */
function loadConfig(packageJson: any): IQuickstartConfig {
  const config = require(`${process.cwd()}/.miix-quickstart`);

  // legacy array-of-tasks format:
  if (config instanceof Array) {
    return { name: packageJson.name, tasks: config };
  }

  return config;
}

/**
 * Compresses the requested folder into a tarball.
 */
function createTarball(folder: string, target: string, callback: Callback) {
  create(
    {
      gzip: true,
      file: target,
      cwd: folder,
    },
    ['./'],
    callback,
  );
}

/**
 * Uploads a tarball to Azure.
 */
function uploadTarball(file: string, name: string, callback: Callback) {
  const blobService = azure.createBlobService();

  blobService.createBlockBlobFromLocalFile(
    'launchpad',
    name,
    file,
    {
      contentSettings: {
        contentType: 'application/gzip',
      },
    },
    callback,
  );
}

function stage(startMessage: string, stopMessage: string, callback?: () => void): Callback {
  const start = Date.now();
  console.log(chalk.gray(` → ${startMessage}`));

  return err => {
    if (err) {
      console.error(chalk.red(String(err.stack || err)));
      process.exit(1);
    }

    console.log(chalk.gray(` ✔ ${stopMessage} (in ${Date.now() - start}ms)`));
    if (callback) {
      callback();
    }
  };
}

/**
 * Creates a folder in the build directory full of the files to be packed.
 */
function createStagingPath(
  tasks: Behavior[],
  basePath: string,
  stagingPath: string,
  callback: Callback,
) {
  mapAll(
    tasks,
    (item, callback) => {
      (<any>behaviors)[item.action](
        {
          basePath,
          stagingPath,
          def: item,
        },
        callback,
      );
    },
    callback,
  );
}

export function run() {
  const packageJson = require(`${process.cwd()}/package.json`);
  const quickstartConfig = loadConfig(packageJson);
  const [major, minor] = packageJson.version.split('.');
  const blobName = `${quickstartConfig.name}_${major}.${minor}.tar.gz`;

  console.log(`Publishing ${blobName}`);

  const stagingPath = `${tmpdir()}/miix-quickstart-publisher`;
  const tarball = `${tmpdir()}/${blobName}`;
  const start = Date.now();

  rimraf(
    stagingPath,
    stage('Preparing workspace', 'Prepared workspace', () => {
      mkdirSync(stagingPath);
      createStagingPath(
        quickstartConfig.tasks,
        process.cwd(),
        stagingPath,
        stage('Preparing files to compress', 'Files ready', () =>
          createTarball(
            stagingPath,
            tarball,
            stage('Creating tarball', 'Finished creating tarball', () =>
              uploadTarball(
                tarball,
                blobName,
                stage('Uploading to Azure', 'Uploaded to Azure', () =>
                  console.log(chalk.green(`\nCompleted in ${Date.now() - start}ms\n`)),
                ),
              ),
            ),
          ),
        ),
      );
    }),
  );
}
