import { cleanDirectory, initDirectory, exec } from '../utils/command';

const logger = console;
const defaultAngularCliVersion = 'latest';

const generateAngularAppWithAngularCLI = async (
  path: string,
  appName: string,
  packageVersion = 'v8-lts'
) => {
  logger.info(`🏗 Bootstraping Angular project with @angular/cli@${packageVersion}`);

  try {
    // TODO: @gaetanmaisse Create an empty `node_modules` and use npx
    await exec(`echo`, [`"{}" > package.json`], { cwd: path });
    await exec(`yarn`, [`add`, `@angular/cli@${packageVersion}`], { cwd: path });

    // TODO: @gaetanmaisse In the future, extract this into a JSON file
    await exec(
      `yarn`,
      [
        `ng`,
        `new`,
        appName,
        `--routing=true`,
        `--minimal=true`,
        `--style=scss`,
        `--skipInstall=true`,
      ],
      { cwd: path }
    );
  } catch (e) {
    logger.error(`‼️ Error during Angular App bootstrapping with @angular/cli@${packageVersion}`);
    throw e;
  }
};

const initStorybookWithCLI = async (path: string) => {
  logger.info(`🎨 Initializing Storybook with @storybook/cli`);
  try {
    await exec(`npx`, [`-p @storybook/cli`, `sb init`, `--skip-install`, `--yes`], { cwd: path });
  } catch (e) {
    logger.error(`‼️ Error during Storybook initialization`);
    throw e;
  }
};

const addRequiredDeps = async (path: string) => {
  logger.info(`🌍 Adding needed deps & installing all deps`);
  try {
    await exec(
      `yarn `,
      [
        `add -D`,
        // FIXME: Move `react` and `react-dom` deps to @storybook/angular
        `react`,
        `react-dom`,
        // TODO: @ndelangen Cypress can be removed and we should use the one from the monorepo
        `http-server`,
        `cypress`,
        `@cypress/webpack-preprocessor`,
        `concurrently`,
      ],
      { cwd: path }
    );
  } catch (e) {
    logger.error(`‼️ Error dependencies installation`);
    throw e;
  }
};

const setupCypressTests = async (path: string) => {
  logger.info(`🎛 Setup Cypress tests`);
  // TODO: @ndelangen Remove this and use monorepo cypress tests instead (be careful `cypress-tests` contains custom tests)
  try {
    await exec(`echo`, [`"{}" > cypress.json`], { cwd: path });
    await exec(`cp`, [`-R`, `../../../cypress-tests`, `cypress`], { cwd: path });
  } catch (e) {
    logger.error(`‼️ Error during Cypress tests setup`);
    throw e;
  }
};

const buildStorybook = async (path: string) => {
  logger.info(`👷 Building Storybook`);
  try {
    await exec(`yarn`, [`build-storybook`], { cwd: path });
  } catch (e) {
    logger.error(`‼️ Error during Storybook build`);
    throw e;
  }
};

const serveStorybook = async (path: string) => {
  // TODO: Just start an http-server with built storybook, and provide a way to stop it when tests are ran
};

const runCypressTests = async (path: string) => {
  logger.info(`🤖 Running Cypress tests`);
  // TODO: Split in 2 steps:
  // - run SB with http-server
  // - then run cypress with env variable/args and use global cypress tests
  try {
    await exec(
      `yarn concurrently`,
      [
        `--success first`,
        `--kill-others`,
        `"cypress run"`,
        `"yarn http-server ./storybook-static -p 8001 --silent"`,
      ],
      { cwd: path }
    );
  } catch (e) {
    logger.error(`‼️ Error during cypress tests execution`);
    throw e;
  }
};

const runTests = async (angularVersion: string) => {
  const basePath = `${__dirname}/tests-run-angular-${angularVersion}`;
  const appName = 'e2e-test-application';
  const testAppPath = `${basePath}/${appName}`;

  logger.info(`📡 Starting E2E for Angular ${angularVersion}`);

  await initDirectory(basePath);

  await generateAngularAppWithAngularCLI(basePath, appName, angularVersion);

  await initStorybookWithCLI(testAppPath);

  await addRequiredDeps(testAppPath);

  await setupCypressTests(testAppPath);

  await buildStorybook(testAppPath);

  await runCypressTests(testAppPath);

  // TODO: Add a variable to skip this cleaning (based on  process.env.CI?), in order to simplify debuging for instance
  logger.info(`🗑 Cleaning test dir for Angular ${angularVersion}`);
  await cleanDirectory(basePath);

  logger.info(`🎉 Storybook is working great with Angular ${angularVersion}!`);
};

let angularCliVersions = process.argv.slice(2);

if (!angularCliVersions || angularCliVersions.length === 0) {
  angularCliVersions = [defaultAngularCliVersion];
}

// Run tests!
Promise.all(angularCliVersions.map(runTests)).catch((e) => {
  logger.error(`🚨 Angular E2E tests fails\n${e}`);
  process.exit(1);
});
