import { SinonMock, mock } from "sinon";
import proxyquire from "proxyquire";

import * as basHandler from "../../../src/devspace-manager/handler/basHandler";
import { messages } from "../../../src/devspace-manager/common/messages";
import { URL } from "node:url";
import { LandscapeInfo } from "../../../src/devspace-manager/landscape/landscape";
import { DevSpaceStatus } from "../../../src/devspace-manager/devspace/devspace";
import { UriHandler } from "vscode";
import { cloneDeep, concat, slice } from "lodash";

describe("basHandler scope", () => {
  let basHandlerProxy: typeof basHandler;

  const proxyWindow = {
    showErrorMessage: () => {
      throw new Error("not implemented");
    },
  };

  const proxyUri = {
    parse: (urlStr: string): any => {},
  };

  const proxyLandscape = {
    cmdLoginToLandscape: () => {
      throw new Error(`not implemented`);
    },
    getLandscapes: () => {
      throw new Error(`not implemented`);
    },
  };

  const proxyLandscapeSet = {
    addLandscape: () => {
      throw new Error("not implemented");
    },
  };

  const proxyDevspaceConnect = {
    cmdDevSpaceConnectNewWindow: () => {
      throw new Error("not implemented");
    },
  };

  const proxyDevSpacesProvider: any = {
    getChildren: () => Promise.resolve([]),
  };

  const proxyNode = {
    getChildren: () => {
      throw new Error(`not implemented`);
    },
  };

  enum proxyTreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2,
  }

  let handler: UriHandler;

  before(() => {
    basHandlerProxy = proxyquire(
      "../../../src/devspace-manager/handler/basHandler",
      {
        vscode: {
          Uri: proxyUri,
          window: proxyWindow,
          "@noCallThru": true,
        },
        "../landscape/landscape": proxyLandscape,
        "../landscape/set": proxyLandscapeSet,
        "../devspace/connect": proxyDevspaceConnect,
      }
    );

    handler = basHandlerProxy.getBasUriHandler(proxyDevSpacesProvider);
  });

  let mockLandscape: SinonMock;
  let mockDevSpaceProvider: SinonMock;
  let mockDevSpaceConnect: SinonMock;
  let mockLandscapeSet: SinonMock;
  let mockWindow: SinonMock;

  beforeEach(() => {
    mockLandscape = mock(proxyLandscape);
    mockDevSpaceProvider = mock(proxyDevSpacesProvider);
    mockDevSpaceConnect = mock(proxyDevspaceConnect);
    mockLandscapeSet = mock(proxyLandscapeSet);
    mockWindow = mock(proxyWindow);
  });

  afterEach(() => {
    mockLandscape.verify();
    mockDevSpaceProvider.verify();
    mockDevSpaceConnect.verify();
    mockLandscapeSet.verify();
    mockWindow.verify();
  });

  const landscapeUrl1 = `https://my.landscape-1.com`;
  const landscapeUrl2 = `https://my.landscape-2.com`;
  const workspaceid = `workspace-my-id1`;

  const uri: any = {
    path: `/open`,
    query: `landscape=${
      new URL(landscapeUrl1).hostname
    }&devspaceid=${workspaceid.split(`-`).slice(1).join(`-`)}`,
    toString: () => `uri:toString`,
  };

  const landscapes: LandscapeInfo[] = [
    {
      name: new URL(landscapeUrl1).hostname,
      url: new URL(landscapeUrl1).toString(),
      isLoggedIn: false,
    },
    {
      name: new URL(landscapeUrl2).hostname,
      url: new URL(landscapeUrl2).toString(),
      isLoggedIn: false,
    },
  ];

  const nodes: any[] = [
    Object.assign(
      {
        contextValue: `log-in-node`,
        name: landscapes[0].name,
        uri: landscapes[0].url,
      },
      proxyNode
    ),
    Object.assign(
      {
        name: landscapes[1].name,
        uri: landscapes[1].url,
      },
      proxyNode
    ),
  ];

  const devspaces: any[] = [
    {
      landscapeUrl: landscapeUrl1,
      id: `my-id1`,
      status: DevSpaceStatus.RUNNING,
    },
    {
      landscapeUrl: landscapeUrl2,
      id: `my-id2`,
      status: DevSpaceStatus.RUNNING,
    },
  ];

  it("hadleUri, ok", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).resolves(nodes);
    const mockLandscapeNode = mock(nodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves(devspaces);
    mockDevSpaceConnect
      .expects(`cmdDevSpaceConnectNewWindow`)
      .withExactArgs(devspaces[0])
      .resolves();
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, uri path is unexpected", async () => {
    const wrongUri = cloneDeep(uri);
    wrongUri.path = `/run`;
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_url_has_incorrect_format(wrongUri.toString())
        )
      );
    await handler.handleUri(wrongUri);
  });

  it("hadleUri, url has wromg 'landscape' param", async () => {
    const wrongParamUri = cloneDeep(uri);
    wrongParamUri.query = `landcape=some-landscape.com&devspaceid=someid`;
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_url_param_missing(wrongParamUri.query, `landscape`)
        )
      );
    await handler.handleUri(wrongParamUri);
  });

  it("hadleUri, url has wromg 'landscape' param format", async () => {
    const wrongParamUri = cloneDeep(uri);
    wrongParamUri.query = `landscape:some-landscape.com&devspaceid=someid`;
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_url_param_missing(wrongParamUri.query, `landscape`)
        )
      );
    await handler.handleUri(wrongParamUri);
  });

  it("hadleUri, url has wromg 'devspaceid' param", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).resolves(nodes);
    const wrongParamUri = cloneDeep(uri);
    wrongParamUri.query = `landscape=${
      new URL(landscapeUrl1).hostname
    }&devspace=${workspaceid.split(`-`).slice(1).join(`-`)}`;
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_url_param_missing(wrongParamUri.query, `devspaceid`)
        )
      );
    await handler.handleUri(wrongParamUri);
  });

  it("hadleUri, landscape not exist, added", async () => {
    const landscapeUrl = `https://my.landscape-other.com`;
    const landscapeParam = new URL(landscapeUrl).hostname;
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    const fullLandscapes = concat(landscapes, {
      name: new URL(landscapeUrl).hostname,
      url: new URL(landscapeUrl).toString(),
      isLoggedIn: false,
    });
    mockLandscapeSet
      .expects(`addLandscape`)
      .withExactArgs(`https://${landscapeParam}`)
      .resolves(fullLandscapes);
    const fullNodes = concat(
      nodes,
      Object.assign(
        {
          label: `label`,
          contextValue: `log-in-node`,
          name: fullLandscapes[2].name,
          uri: fullLandscapes[2].url,
        },
        proxyNode
      )
    );
    mockDevSpaceProvider.expects(`getChildren`).resolves(fullNodes);
    const mockLandscapeNode = mock(fullNodes[2]);
    mockLandscapeNode.expects(`getChildren`).resolves(devspaces);
    mockDevSpaceConnect
      .expects(`cmdDevSpaceConnectNewWindow`)
      .withExactArgs(devspaces[0])
      .resolves();
    const otherUri = cloneDeep(uri);
    otherUri.query = `landscape=${landscapeParam}&devspaceid=${workspaceid
      .split(`-`)
      .slice(1)
      .join(`-`)}`;
    await handler.handleUri(otherUri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, landscape node not found", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    const missedNodes = slice(nodes, 1);
    mockDevSpaceProvider.expects(`getChildren`).resolves(missedNodes);
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_landscape_not_added(new URL(landscapeUrl1).hostname)
        )
      );
    await handler.handleUri(uri);
  });

  it("hadleUri, landscape is not log in", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    const copyNodes = cloneDeep(nodes);
    copyNodes[0].contextValue = `log-out-node`;
    mockLandscape
      .expects(`cmdLoginToLandscape`)
      .withExactArgs(copyNodes[0])
      .resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).twice().resolves(copyNodes);
    const mockLandscapeNode = mock(copyNodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves(devspaces);
    mockDevSpaceConnect
      .expects(`cmdDevSpaceConnectNewWindow`)
      .withExactArgs(devspaces[0])
      .resolves();
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, landscape is not log in (contex value empty)", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    const copyNodes = cloneDeep(nodes);
    delete copyNodes[0].contextValue;
    mockLandscape
      .expects(`cmdLoginToLandscape`)
      .withExactArgs(copyNodes[0])
      .resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).twice().resolves(copyNodes);
    const mockLandscapeNode = mock(copyNodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves(devspaces);
    mockDevSpaceConnect
      .expects(`cmdDevSpaceConnectNewWindow`)
      .withExactArgs(devspaces[0])
      .resolves();
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, landscape is empty (there are no devscapes)", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).resolves(nodes);
    const mockLandscapeNode = mock(nodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves([]);
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_no_devspaces_in_landscape(nodes[0].name)
        )
      );
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, devspace not found", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).resolves(nodes);
    const mockLandscapeNode = mock(nodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves(slice(devspaces, 1));
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_devspace_missing(
            workspaceid.split(`-`).slice(1).join(`-`)
          )
        )
      );
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });

  it("hadleUri, ok", async () => {
    mockLandscape.expects(`getLandscapes`).resolves(landscapes);
    mockDevSpaceProvider.expects(`getChildren`).resolves(nodes);
    const cloned = cloneDeep(devspaces);
    cloned[0].status = DevSpaceStatus.STOPPED;
    const mockLandscapeNode = mock(nodes[0]);
    mockLandscapeNode.expects(`getChildren`).resolves(cloned);
    mockWindow
      .expects(`showErrorMessage`)
      .withExactArgs(
        messages.err_open_devspace_in_code(
          messages.err_devspace_must_be_started
        )
      );
    await handler.handleUri(uri);
    mockLandscapeNode.verify();
  });
});
