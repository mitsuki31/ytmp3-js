import fs from 'node:fs';
import path from 'node:path';

import type { PackageJSON } from '#/types/config';
import type { ProjectMetadata } from '#/globals';
import { type Logger, NoneLogger, DefaultLogger, CSI, style as $c, ROOTDIR } from '#/utils';
import { getGlob, hasSetup, setGlob } from '#runtime/env';
import { getStatus, setStatus } from '../constants';

const pkgJsonPath = path.join(ROOTDIR, 'package.json');

export default function init({ logger }: { logger?: Logger }) {
  // * Setup guard
  if (getStatus('metadata')) return;

  if (!hasSetup()) {
    DefaultLogger.error('Metadata setup failed: Application has not been initialized yet.');
    return;
  }

  if (!logger) logger = getGlob('logger', NoneLogger) as Logger;

  logger.debug(`Retrieving project metadata from ${$c([0, 'BY'], 'package.json')} ...`);

  logger.debug("=> require('ytmp3-js/package.json')");
  const pkg: PackageJSON = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const versionKeys = ['major', 'minor', 'patch', 'preRelease'] as (keyof ProjectMetadata['version'])[];
  const versionParts = (pkg.version ?? '0.0.0-dev').split(/-|\./);

  const authorEmailMatch = /<(\w+@[a-z0-9.]+)>/m.exec(pkg.author);
  const authorUrlMatch = /\((https?:\/\/.+)\)/m.exec(pkg.author);
  const author = {
    name: pkg.author.split(' <')[0],
    email: authorEmailMatch ? authorEmailMatch[1] : null,
    url: authorUrlMatch ? authorUrlMatch[1] : null
  };

  const versionStr = (() => {
    // eslint-disable-next-line prefer-const
    let [ ver, rel ] = (pkg.version || '0.0.0-dev').split('-');
    rel = (rel && rel.length !== 0)
      ? rel.toUpperCase()
      : 'STABLE';
    return `${CSI(1)}[${pkg.name.toUpperCase()}] v${ver} ${CSI(96)}${rel}${CSI(0)}\n`;
  })();

  const version = versionKeys.reduce((acc, key, index) => {
    if ((versionKeys.slice(0, versionKeys.length - 1)).includes(key)) {
      acc[key as Exclude<typeof key, 'preRelease'>] = parseInt(versionParts[index], 10);
      return acc;
    }
    // If no pre-release specified in package.json, it means a stable release
    if (key === 'preRelease') acc[key] = 'stable';
    return acc;
  }, {} as ProjectMetadata["version"]);

  // Get the actual dependencies version from their package.json
  const dependencies = Object.entries(pkg.dependencies).reduce((acc, [dep, fallbackVersion]) => {
    logger.debug(`=> require('ytmp3-js/node_modules/${dep}/package.json')`);
    const ver: string | undefined = JSON.parse(fs.readFileSync(path.join(ROOTDIR, 'node_modules', dep, 'package.json'), 'utf8')).version;
    acc[dep] = (ver ?? fallbackVersion).replace(/^[\^~]/, '');
    return acc;
  }, {} as Record<string, string>);

  const copyright = `${pkg.name} - Copyright (c) 2023-${
    new Date().getFullYear()} ${author.name} (${author.url})\n`;

  const metadata: ProjectMetadata = {
    name: pkg.name,
    title: pkg.title,
    description: pkg.description,
    scriptName: 'ytmp3',
    author,
    version,
    versionStr,
    copyright,
    homepageUrl: pkg.homepage,
    repository: pkg.repository.url,
    dependencies,
    devDependencies: pkg.devDependencies,
  };

  // Set the project metadata in global
  setGlob('$__metadata__$', metadata);

  setStatus('metadata', true);  // Mark as completed
  logger.debug('Project metadata retrieved.');
}
