/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/base/common/event';

import { ISelectionData } from 'azdata';

import {
	IConnectionParams,
	INewConnectionParams,
	ConnectionType,
	RunQueryOnConnectionMode
} from 'sql/platform/connection/common/connectionManagement';
import {
	RunQueryAction, CancelQueryAction, ListDatabasesActionItem,
	DisconnectDatabaseAction, ConnectDatabaseAction, QueryTaskbarAction
} from 'sql/workbench/contrib/query/browser/queryActions';
import { QueryEditor } from 'sql/workbench/contrib/query/browser/queryEditor';
import { QueryModelService } from 'sql/platform/query/common/queryModelService';
import { IConnectionProfile } from 'sql/platform/connection/common/interfaces';

import * as TypeMoq from 'typemoq';
import * as assert from 'assert';
import { TestStorageService, TestFileService } from 'vs/workbench/test/workbenchTestServices';
import { MockContextKeyService } from 'vs/platform/keybinding/test/common/mockKeybindingService';
import { UntitledQueryEditorInput } from 'sql/workbench/contrib/query/common/untitledQueryEditorInput';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { TestQueryModelService } from 'sql/platform/query/test/common/testQueryModelService';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';
import { URI } from 'vs/base/common/uri';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { TestConnectionManagementService } from 'sql/platform/connection/test/common/testConnectionManagementService';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';

suite('SQL QueryAction Tests', () => {

	let testUri: string = 'testURI';
	let editor: TypeMoq.Mock<QueryEditor>;
	let calledRunQueryOnInput: boolean = undefined;
	let testQueryInput: TypeMoq.Mock<UntitledQueryEditorInput>;
	let configurationService: TypeMoq.Mock<TestConfigurationService>;
	let queryModelService: TypeMoq.Mock<TestQueryModelService>;
	let connectionManagementService: TypeMoq.Mock<TestConnectionManagementService>;

	setup(() => {

		const contextkeyservice = new MockContextKeyService();

		// Setup a reusable mock QueryEditor
		editor = TypeMoq.Mock.ofType(QueryEditor, TypeMoq.MockBehavior.Strict, undefined, new TestThemeService(),
			new TestStorageService(), contextkeyservice, undefined, new TestFileService(), undefined);
		editor.setup(x => x.input).returns(() => testQueryInput.object);

		editor.setup(x => x.getSelection()).returns(() => undefined);
		editor.setup(x => x.getSelection(false)).returns(() => undefined);
		editor.setup(x => x.isSelectionEmpty()).returns(() => false);
		configurationService = TypeMoq.Mock.ofInstance({
			getValue: () => undefined,
			onDidChangeConfiguration: () => undefined
		} as any);
		configurationService.setup(x => x.getValue(TypeMoq.It.isAny())).returns(() => {
			return {};
		});
		queryModelService = TypeMoq.Mock.ofType<TestQueryModelService>(TestQueryModelService);
		queryModelService.setup(q => q.onRunQueryStart).returns(() => Event.None);
		queryModelService.setup(q => q.onRunQueryComplete).returns(() => Event.None);
		connectionManagementService = TypeMoq.Mock.ofType<TestConnectionManagementService>(TestConnectionManagementService);
		connectionManagementService.setup(q => q.onDisconnect).returns(() => Event.None);
		const instantiationService = new TestInstantiationService();
		let fileInput = new UntitledEditorInput(URI.parse('file://testUri'), false, '', '', '', instantiationService, undefined, undefined);
		// Setup a reusable mock QueryInput
		testQueryInput = TypeMoq.Mock.ofType(UntitledQueryEditorInput, TypeMoq.MockBehavior.Strict, undefined, fileInput, undefined, connectionManagementService.object, queryModelService.object, configurationService.object);
		testQueryInput.setup(x => x.uri).returns(() => testUri);
		testQueryInput.setup(x => x.runQuery(undefined)).callback(() => { calledRunQueryOnInput = true; });
	});

	test('setClass sets child CSS class correctly', (done) => {
		// If I create a RunQueryAction
		let queryAction: QueryTaskbarAction = new RunQueryAction(undefined, undefined, undefined);

		// "class should automatically get set to include the base class and the RunQueryAction class
		let className = RunQueryAction.EnabledClass;
		assert.equal(queryAction.class, className, 'CSS class not properly set');
		done();
	});

	test('getConnectedQueryEditorUri returns connected URI only if connected', (done) => {
		// ... Create assert variables
		let isConnectedReturnValue: boolean = false;

		// ... Mock "isConnected in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnectedReturnValue);

		const contextkeyservice = new MockContextKeyService();

		// Setup a reusable mock QueryEditor
		editor = TypeMoq.Mock.ofType(QueryEditor, TypeMoq.MockBehavior.Strict, undefined, new TestThemeService(),
			new TestStorageService(), contextkeyservice, undefined, new TestFileService(), undefined);
		editor.setup(x => x.input).returns(() => testQueryInput.object);

		// If I create a QueryTaskbarAction and I pass a non-connected editor to _getConnectedQueryEditorUri
		let queryAction: QueryTaskbarAction = new RunQueryAction(undefined, undefined, connectionManagementService.object);
		let connected: boolean = queryAction.isConnected(editor.object);

		// I should get an unconnected state
		assert(!connected, 'Non-connected editor should get back an undefined URI');

		// If I run with a connected URI
		isConnectedReturnValue = true;
		connected = queryAction.isConnected(editor.object);

		// I should get a connected state
		assert(connected, 'Connected editor should get back a non-undefined URI');
		done();
	});

	test('RunQueryAction calls runQuery() only if URI is connected', (done) => {
		// ... Create assert variables
		let isConnected: boolean = undefined;
		let connectionParams: INewConnectionParams = undefined;
		let countCalledShowDialog: number = 0;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.callBase = true;
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.showConnectionDialog(TypeMoq.It.isAny()))
			.callback((params: INewConnectionParams) => {
				connectionParams = params;
				countCalledShowDialog++;
			})
			.returns(() => Promise.resolve());

		// ... Mock QueryModelService
		let queryModelService = TypeMoq.Mock.ofType(QueryModelService, TypeMoq.MockBehavior.Loose);
		queryModelService.setup(x => x.runQuery(TypeMoq.It.isAny(), undefined, TypeMoq.It.isAny(), TypeMoq.It.isAny()));

		// If I call run on RunQueryAction when I am not connected
		let queryAction: RunQueryAction = new RunQueryAction(editor.object, queryModelService.object, connectionManagementService.object);
		isConnected = false;
		calledRunQueryOnInput = false;
		queryAction.run();

		// runQuery should not be run
		assert.equal(calledRunQueryOnInput, false, 'run should not call runQuery');
		testQueryInput.verify(x => x.runQuery(undefined), TypeMoq.Times.never());

		// and the connection dialog should open with the correct parameter details
		assert.equal(connectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(connectionParams.runQueryOnCompletion, RunQueryOnConnectionMode.executeQuery, 'runQueryOnCompletion should be true`');
		assert.equal(connectionParams.input.uri, testUri, 'URI should be set to the test URI');
		assert.equal(connectionParams.input, editor.object.input, 'Editor should be set to the mock editor');

		// If I call run on RunQueryAction when I am connected
		isConnected = true;
		queryAction.run();

		//runQuery should be run, and the conneciton dialog should not open
		assert.equal(calledRunQueryOnInput, true, 'run should call runQuery');
		testQueryInput.verify(x => x.runQuery(undefined), TypeMoq.Times.once());

		assert.equal(countCalledShowDialog, 1, 'run should not call showDialog');
		done();
	});

	test('Queries are only run if the QueryEditor selection is not empty', (done) => {
		// ... Create assert variables
		let isSelectionEmpty: boolean = undefined;
		let countCalledRunQuery: number = 0;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => true);

		// ... Mock QueryModelService
		let queryModelService = TypeMoq.Mock.ofType(QueryModelService, TypeMoq.MockBehavior.Loose);
		queryModelService.setup(x => x.onRunQueryStart).returns(() => Event.None);
		queryModelService.setup(x => x.onRunQueryComplete).returns(() => Event.None);
		const instantiationService = new TestInstantiationService();
		let fileInput = new UntitledEditorInput(URI.parse('file://testUri'), false, '', '', '', instantiationService, undefined, undefined);

		// ... Mock "isSelectionEmpty" in QueryEditor
		let queryInput = TypeMoq.Mock.ofType(UntitledQueryEditorInput, TypeMoq.MockBehavior.Strict, undefined, fileInput, undefined, connectionManagementService.object, queryModelService.object, configurationService.object);
		queryInput.setup(x => x.uri).returns(() => testUri);
		queryInput.setup(x => x.runQuery(undefined)).callback(() => {
			countCalledRunQuery++;
		});
		const contextkeyservice = new MockContextKeyService();

		// Setup a reusable mock QueryEditor
		let queryEditor = TypeMoq.Mock.ofType(QueryEditor, TypeMoq.MockBehavior.Strict, undefined, new TestThemeService(),
			new TestStorageService(), contextkeyservice, undefined, new TestFileService(), undefined);
		queryEditor.setup(x => x.input).returns(() => queryInput.object);
		queryEditor.setup(x => x.getSelection()).returns(() => undefined);
		queryEditor.setup(x => x.getSelection(false)).returns(() => undefined);
		queryEditor.setup(x => x.isSelectionEmpty()).returns(() => isSelectionEmpty);

		// If I call run on RunQueryAction when I have a non empty selection
		let queryAction: RunQueryAction = new RunQueryAction(queryEditor.object, queryModelService.object, connectionManagementService.object);
		isSelectionEmpty = false;
		queryAction.run();

		//runQuery should be run
		assert.equal(countCalledRunQuery, 1, 'runQuery should be called');

		// If I call run on RunQueryAction when I have an empty selection
		isSelectionEmpty = true;
		queryAction.run();

		//runQuery should not be run again
		assert.equal(countCalledRunQuery, 1, 'runQuery should not be called again');
		done();
	});

	test('ISelectionData is properly passed when queries are run', () => {

		/// Setup Test ///

		// ... Create assert variables
		let isConnected: boolean = undefined;
		let countCalledShowDialog: number = 0;
		let countCalledRunQuery: number = 0;
		let showDialogConnectionParams: INewConnectionParams = undefined;
		let runQuerySelection: ISelectionData = undefined;
		let selectionToReturnInGetSelection: ISelectionData = undefined;
		let predefinedSelection: ISelectionData = { startLine: 1, startColumn: 2, endLine: 3, endColumn: 4 };

		// ... Mock "getSelection" in QueryEditor
		const instantiationService = new TestInstantiationService();
		let fileInput = new UntitledEditorInput(URI.parse('file://testUri'), false, '', '', '', instantiationService, undefined, undefined);

		let queryInput = TypeMoq.Mock.ofType(UntitledQueryEditorInput, TypeMoq.MockBehavior.Loose, undefined, fileInput, undefined, connectionManagementService.object, queryModelService.object, configurationService.object);
		queryInput.setup(x => x.uri).returns(() => testUri);
		queryInput.setup(x => x.runQuery(TypeMoq.It.isAny())).callback((selection: ISelectionData) => {
			runQuerySelection = selection;
			countCalledRunQuery++;
		});
		queryInput.setup(x => x.runQuery(undefined)).callback((selection: ISelectionData) => {
			runQuerySelection = selection;
			countCalledRunQuery++;
		});
		const contextkeyservice = new MockContextKeyService();

		// Setup a reusable mock QueryEditor
		let queryEditor = TypeMoq.Mock.ofType(QueryEditor, TypeMoq.MockBehavior.Strict, undefined, new TestThemeService(),
			new TestStorageService(), contextkeyservice, undefined, new TestFileService(), undefined);
		queryEditor.setup(x => x.input).returns(() => queryInput.object);
		queryEditor.setup(x => x.isSelectionEmpty()).returns(() => false);
		queryEditor.setup(x => x.getSelection()).returns(() => {
			return selectionToReturnInGetSelection;
		});
		queryEditor.setup(x => x.getSelection(TypeMoq.It.isAny())).returns(() => {
			return selectionToReturnInGetSelection;
		});

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.showConnectionDialog(TypeMoq.It.isAny()))
			.callback((params: INewConnectionParams) => {
				showDialogConnectionParams = params;
				countCalledShowDialog++;
			})
			.returns(() => Promise.resolve());

		/// End Setup Test ///

		////// If I call run on RunQueryAction while disconnected and with an undefined selection
		let queryAction: RunQueryAction = new RunQueryAction(queryEditor.object, undefined, connectionManagementService.object);
		isConnected = false;
		selectionToReturnInGetSelection = undefined;
		queryAction.run();

		// The conneciton dialog should open with an undefined seleciton
		assert.equal(countCalledShowDialog, 1, 'run should call showDialog');
		assert.equal(countCalledRunQuery, 0, 'run should not call runQuery');
		assert.equal(showDialogConnectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(showDialogConnectionParams.querySelection, undefined, 'querySelection should be undefined');

		////// If I call run on RunQueryAction while disconnected and with a defined selection
		isConnected = false;
		selectionToReturnInGetSelection = predefinedSelection;
		queryAction.run();

		// The conneciton dialog should open with the correct seleciton
		assert.equal(countCalledShowDialog, 2, 'run should call showDialog again');
		assert.equal(countCalledRunQuery, 0, 'run should not call runQuery');
		assert.equal(showDialogConnectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.notEqual(showDialogConnectionParams.querySelection, undefined, 'There should not be an undefined selection in runQuery');
		assert.equal(showDialogConnectionParams.querySelection.startLine, selectionToReturnInGetSelection.startLine, 'startLine should match');
		assert.equal(showDialogConnectionParams.querySelection.startColumn, selectionToReturnInGetSelection.startColumn, 'startColumn should match');
		assert.equal(showDialogConnectionParams.querySelection.endLine, selectionToReturnInGetSelection.endLine, 'endLine should match');
		assert.equal(showDialogConnectionParams.querySelection.endColumn, selectionToReturnInGetSelection.endColumn, 'endColumn should match');

		////// If I call run on RunQueryAction while connected and with an undefined selection
		isConnected = true;
		selectionToReturnInGetSelection = undefined;
		queryAction.run();

		// The query should run with an undefined selection
		assert.equal(countCalledShowDialog, 2, 'run should not call showDialog');
		assert.equal(countCalledRunQuery, 1, 'run should call runQuery');
		assert.equal(runQuerySelection, undefined, 'There should be an undefined selection in runQuery');

		////// If I call run on RunQueryAction while connected and with a defined selection
		isConnected = true;
		selectionToReturnInGetSelection = predefinedSelection;
		queryAction.run();

		// The query should run with the given seleciton
		assert.equal(countCalledShowDialog, 2, 'run should not call showDialog');
		assert.equal(countCalledRunQuery, 2, 'run should call runQuery again');
		assert.notEqual(runQuerySelection, undefined, 'There should not be an undefined selection in runQuery');
		assert.equal(runQuerySelection.startLine, selectionToReturnInGetSelection.startLine, 'startLine should match');
		assert.equal(runQuerySelection.startColumn, selectionToReturnInGetSelection.startColumn, 'startColumn should match');
		assert.equal(runQuerySelection.endLine, selectionToReturnInGetSelection.endLine, 'endLine should match');
		assert.equal(runQuerySelection.endColumn, selectionToReturnInGetSelection.endColumn, 'endColumn should match');
	});

	test('CancelQueryAction calls cancelQuery() only if URI is connected', (done) => {
		// ... Create assert variables
		let isConnected: boolean = undefined;
		let calledCancelQuery: boolean = false;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);

		// ... Mock QueryModelService
		let queryModelService = TypeMoq.Mock.ofType(QueryModelService, TypeMoq.MockBehavior.Loose);
		queryModelService.setup(x => x.cancelQuery(TypeMoq.It.isAny())).callback(() => {
			calledCancelQuery = true;
		});

		// If I call run on CancelQueryAction when I am not connected
		let queryAction: CancelQueryAction = new CancelQueryAction(editor.object, queryModelService.object, connectionManagementService.object);
		isConnected = false;
		queryAction.run();

		// cancelQuery should not be run
		assert.equal(calledCancelQuery, false, 'run should not call cancelQuery');

		// If I call run on CancelQueryAction when I am connected
		isConnected = true;
		queryAction.run();

		// cancelQuery should be run
		assert.equal(calledCancelQuery, true, 'run should call cancelQuery');
		done();
	});

	// We want to call disconnectEditor regardless of connection to be able to cancel in-progress connections
	test('DisconnectDatabaseAction calls disconnectEditor regardless of URI being connected', (done) => {
		// ... Create assert variables
		let isConnected: boolean = undefined;
		let countCalledDisconnectEditor: number = 0;

		// ... Mock "isConnected" and "disconnectEditor" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.disconnectEditor(TypeMoq.It.isAny())).callback(() => {
			countCalledDisconnectEditor++;
		});

		// If I call run on DisconnectDatabaseAction when I am not connected
		let queryAction: DisconnectDatabaseAction = new DisconnectDatabaseAction(editor.object, connectionManagementService.object);
		isConnected = false;
		queryAction.run();

		// disconnectEditor should be run
		assert.equal(countCalledDisconnectEditor, 1, 'disconnectEditor should be called when URI is not connected');

		// If I call run on DisconnectDatabaseAction when I am connected
		isConnected = true;
		queryAction.run();

		// disconnectEditor should be run again
		assert.equal(countCalledDisconnectEditor, 2, 'disconnectEditor should be called when URI is connected');
		done();
	});

	test('ConnectDatabaseAction opens dialog regardless of URI connection state', (done) => {
		// ... Create assert variables
		let isConnected: boolean = undefined;
		let connectionParams: INewConnectionParams = undefined;
		let countCalledShowDialog: number = 0;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.showConnectionDialog(TypeMoq.It.isAny()))
			.callback((params: INewConnectionParams) => {
				connectionParams = params;
				countCalledShowDialog++;
			})
			.returns(() => Promise.resolve());

		// If I call run on ConnectDatabaseAction when I am not connected
		let queryAction: ConnectDatabaseAction = new ConnectDatabaseAction(editor.object, false, connectionManagementService.object);
		isConnected = false;
		queryAction.run();

		// The conneciton dialog should open with the correct parameter details
		assert.equal(countCalledShowDialog, 1, 'run should call showDialog');
		assert.equal(connectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(connectionParams.runQueryOnCompletion, false, 'runQueryOnCompletion should be false`');
		assert.equal(connectionParams.input.uri, testUri, 'URI should be set to the test URI');
		assert.equal(connectionParams.input, editor.object.input, 'Editor should be set to the mock editor');

		// If I call run on ConnectDatabaseAction when I am connected
		isConnected = true;
		queryAction.run();

		// The conneciton dialog should open again with the correct parameter details
		assert.equal(countCalledShowDialog, 2, 'run should call showDialog');
		assert.equal(connectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(connectionParams.runQueryOnCompletion, false, 'runQueryOnCompletion should be false`');
		assert.equal(connectionParams.input.uri, testUri, 'URI should be set to the test URI');
		assert.equal(connectionParams.input, editor.object.input, 'Editor should be set to the mock editor');
		done();
	});

	test('ChangeConnectionAction connects regardless of URI being connected', (done) => {
		// ... Create assert variables
		let queryAction: ConnectDatabaseAction = undefined;
		let isConnected: boolean = undefined;
		let connectionParams: INewConnectionParams = undefined;
		let calledShowDialog: number = 0;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.showConnectionDialog(TypeMoq.It.isAny()))
			.callback((params: INewConnectionParams) => {
				calledShowDialog++;
				connectionParams = params;
			}).returns(() => Promise.resolve());

		// If I call run on ChangeConnectionAction when I am not connected
		queryAction = new ConnectDatabaseAction(editor.object, false, connectionManagementService.object);
		isConnected = false;
		queryAction.run();

		// The connection dialog should open with the params set as below
		assert.equal(calledShowDialog, 1, 'showDialog should be called when URI is connected');
		assert.equal(connectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(connectionParams.runQueryOnCompletion, false, 'runQueryOnCompletion should be false`');
		assert.equal(connectionParams.input.uri, testUri, 'URI should be set to the test URI');
		assert.equal(connectionParams.input, editor.object.input, 'Editor should be set to the mock editor');
		// Then if I call run on ChangeConnectionAction when I am connected
		isConnected = true;
		queryAction.run();

		// The conneciton dialog should open with the params set as below
		assert.equal(calledShowDialog, 2, 'showDialog should be called when URI is connected');
		assert.equal(connectionParams.connectionType, ConnectionType.editor, 'connectionType should be queryEditor');
		assert.equal(connectionParams.runQueryOnCompletion, false, 'runQueryOnCompletion should be false`');
		assert.equal(connectionParams.input.uri, testUri, 'URI should be set to the test URI');
		assert.equal(connectionParams.input, editor.object.input, 'Editor should be set to the mock editor');
		done();
	});

	test('ListDatabaseItem shows items as expected', (done) => {
		// ... Create assert variables
		let listItem: ListDatabasesActionItem = undefined;
		let isConnected: boolean = undefined;
		let databaseName: string = undefined;

		// ... Mock "isConnected" in ConnectionManagementService
		connectionManagementService.setup(x => x.isConnected(TypeMoq.It.isAnyString())).returns(() => isConnected);
		connectionManagementService.setup(x => x.onConnectionChanged).returns(() => Event.None);
		connectionManagementService.setup(x => x.getConnectionProfile(TypeMoq.It.isAny())).returns(() => <IConnectionProfile>{
			databaseName: databaseName
		});

		// If I query without having initialized anything, state should be clear
		listItem = new ListDatabasesActionItem(editor.object, undefined, connectionManagementService.object, undefined, configurationService.object);

		assert.equal(listItem.isEnabled(), false, 'do not expect dropdown enabled unless connected');
		assert.equal(listItem.currentDatabaseName, undefined, 'do not expect dropdown to have entries unless connected');

		// When I connect, database name should be returned in the dropdown and this should be enabled
		isConnected = true;
		databaseName = 'master';
		listItem.onConnected();
		assert.equal(listItem.isEnabled(), true, 'expect dropdown enabled when connected');
		assert.equal(listItem.currentDatabaseName, 'master', 'expect dropdown to have current DB name when connected');

		// When I disconnect, state should return to default
		isConnected = false;
		databaseName = undefined;
		listItem.onDisconnect();
		assert.equal(listItem.isEnabled(), false, 'do not expect dropdown enabled unless connected');
		assert.equal(listItem.currentDatabaseName, undefined, 'do not expect dropdown to have entries unless connected');

		done();
	});

	test('ListDatabaseItem - null event params', () => {
		// Setup:
		// ... Create event emitter we can use to trigger db changed event
		let dbChangedEmitter = new Emitter<IConnectionParams>();

		// ... Create mock connection management service
		let databaseName = 'foobar';
		connectionManagementService.setup(x => x.onConnectionChanged).returns(() => dbChangedEmitter.event);
		connectionManagementService.setup(x => x.getConnectionProfile(TypeMoq.It.isAny())).returns(() => <IConnectionProfile>{ databaseName: databaseName });

		// ... Create a database dropdown that has been connected
		let listItem = new ListDatabasesActionItem(editor.object, undefined, connectionManagementService.object, undefined, configurationService.object);
		listItem.onConnected();

		// If: I raise a connection changed event
		let eventParams = null;
		dbChangedEmitter.fire(eventParams);

		// Then: The selected database should not have changed
		assert.equal(listItem.currentDatabaseName, databaseName);
	});

	test('ListDatabaseItem - wrong uri', () => {
		// Setup:
		// ... Create event emitter we can use to trigger db changed event
		let dbChangedEmitter = new Emitter<IConnectionParams>();

		// ... Create mock connection management service that will not claim it's connected
		let databaseName = 'foobar';
		connectionManagementService.setup(x => x.onConnectionChanged).returns(() => dbChangedEmitter.event);
		connectionManagementService.setup(x => x.getConnectionProfile(TypeMoq.It.isAny())).returns(() => <IConnectionProfile>{ databaseName: databaseName });

		// ... Create a database dropdown that has been connected
		let listItem = new ListDatabasesActionItem(editor.object, undefined, connectionManagementService.object, undefined, configurationService.object);
		listItem.onConnected();

		// If: I raise a connection changed event for the 'wrong' URI
		let eventParams = <IConnectionParams>{
			connectionProfile: {
				databaseName: 'foobarbaz'
			},
			connectionUri: 'foobarUri'
		};
		dbChangedEmitter.fire(eventParams);

		// Then: The selected database should not have changed
		assert.equal(listItem.currentDatabaseName, databaseName);
	});

	test('ListDatabaseItem - updates when connected and uri matches', () => {
		// Setup:
		// ... Create event emitter we can use to trigger db changed event
		let dbChangedEmitter = new Emitter<IConnectionParams>();

		// ... Create mock connection management service
		connectionManagementService.setup(x => x.onConnectionChanged).returns(() => dbChangedEmitter.event);

		// ... Create a database dropdown
		let listItem = new ListDatabasesActionItem(editor.object, undefined, connectionManagementService.object, undefined, configurationService.object);

		// If: I raise a connection changed event
		let eventParams = <IConnectionParams>{
			connectionProfile: {
				databaseName: 'foobarbaz'
			},
			connectionUri: editor.object.input.uri
		};
		dbChangedEmitter.fire(eventParams);

		// Then:
		// ... The connection should have changed to the provided database
		assert.equal(listItem.currentDatabaseName, eventParams.connectionProfile.databaseName);
	});
});
