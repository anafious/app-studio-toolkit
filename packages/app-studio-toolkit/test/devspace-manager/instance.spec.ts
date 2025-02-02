import { expect } from "chai";
import { mockVscode } from "../../test/mockUtil";
import { SinonSandbox, SinonMock, createSandbox } from "sinon";

enum ConfigurationTargetProxy {
  Global = 1,
}

let registry: Map<string, () => void>;

const vscodeProxy = {
  workspace: {
    getConfiguration: () => {
      return {
        get: () => "",
        update: () => "",
      };
    },
    onDidChangeWorkspaceFolders: () => {},
    onDidChangeSessions: () => {},
  },
  commands: {
    registerCommand: (command: string, handler: () => void) => {
      registry.set(command, handler);
    },
    executeCommand: (...args: any) => {},
  },
  window: {
    createTreeView: () => {},
    registerUriHandler: () => {},
  },
  TreeItem: class MockTreeItem {
    public readonly label: string;
    constructor(label?: string) {
      this.label = label || "";
    }
  },
  Disposable: {
    dispose: () => {},
  },
  ConfigurationTarget: ConfigurationTargetProxy,
  authentication: {
    getSession: () => {},
    registerAuthenticationProvider: () => {},
  },
  EventEmitter: class EventEmitterMock {
    constructor() {}
  },
};

mockVscode(vscodeProxy, "dist/src/authentication/authProvider.js");
mockVscode(vscodeProxy, "dist/src/devspace-manager/instance.js");

import * as instance from "../../src/devspace-manager/instance";
import { BasRemoteAuthenticationProvider } from "../../src/authentication/authProvider";

describe("extension unit test", () => {
  let sandbox: SinonSandbox;
  let authenticationMock: SinonMock;
  let commandsMock: SinonMock;

  before(() => {
    sandbox = createSandbox();
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registry = new Map<string, () => void>();
    authenticationMock = sandbox.mock(vscodeProxy.authentication);
    commandsMock = sandbox.mock(vscodeProxy.commands);
  });

  afterEach(() => {
    authenticationMock.verify();
    commandsMock.verify();
  });

  const context: any = {
    subscriptions: {
      push: () => {},
    },
  };

  describe("initBasRemoteExplorer", () => {
    it("verifying registered commands", async () => {
      await instance.initBasRemoteExplorer(context);
      const commands = [
        `local-extension.tree.settings`,
        `local-extension.tree.refresh`,
        `local-extension.dev-space.connect-new-window`,
        `local-extension.dev-space.open-in-bas`,
        `local-extension.dev-space.start`,
        `local-extension.dev-space.stop`,
        `local-extension.dev-space.delete`,
        `local-extension.dev-space.add`,
        `local-extension.dev-space.edit`,
        `local-extension.dev-space.copy-ws-id`,
        `local-extension.landscape.open-dev-space-manager`,
        `local-extension.landscape.add`,
        `local-extension.landscape.delete`,
        `local-extension.landscape.set`,
        `local-extension.login`,
        `local-extension.dev-space.open-in-code`,
      ];
      expect(registry.size).to.be.equal(commands.length);
      for (const item of registry.keys()) {
        expect(commands.includes(item)).to.be.true;
      }
    });

    it("authentication provider registered", async () => {
      authenticationMock
        .expects(`registerAuthenticationProvider`)
        .withArgs(
          BasRemoteAuthenticationProvider.id,
          "Business Application Studio"
        )
        .returns({});
      await instance.initBasRemoteExplorer(context);
    });

    it("command `local-extension.tree.settings`", async () => {
      commandsMock
        .expects(`executeCommand`)
        .withExactArgs(`workbench.action.openSettings`, `Desktop Client`)
        .returns({});
      await instance.initBasRemoteExplorer(context);
      registry.get(`local-extension.tree.settings`)?.();
    });
  });

  it("deactivate", () => {
    instance.deactivateBasRemoteExplorer();
  });
});
