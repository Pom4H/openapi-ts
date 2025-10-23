import type { Selector } from '@hey-api/codegen-core';

import type { Plugin } from '~/plugins/types';

type SelectorType = 'triggers' | 'byKind' | 'authMap' | 'meta';

export type IApi = {
  /**
   * @param type Selector type.
   * @param value Depends on `type`:
   *  - `triggers`: never
   *  - `byKind`: never
   *  - `authMap`: never
   *  - `meta`: never
   * @returns Selector array
   */
  selector: (type: SelectorType, value?: string) => Selector;
};

export class Api implements IApi {
  constructor(public meta: Plugin.Name<'@hey-api/trigger-extractor'>) {}

  selector(...args: ReadonlyArray<string | undefined>): Selector {
    return [this.meta.name, ...(args as Selector)];
  }
}
