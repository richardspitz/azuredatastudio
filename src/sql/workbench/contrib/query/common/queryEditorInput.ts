/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IDisposable, Disposable } from 'vs/base/common/lifecycle';
import { Emitter } from 'vs/base/common/event';
import { URI } from 'vs/base/common/uri';
import { EditorInput, ConfirmResult } from 'vs/workbench/common/editor';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IFileService } from 'vs/platform/files/common/files';

import { IConnectionManagementService, IConnectableInput, INewConnectionParams, RunQueryOnConnectionMode } from 'sql/platform/connection/common/connectionManagement';
import { QueryResultsInput } from 'sql/workbench/contrib/query/common/queryResultsInput';
import { IQueryModelService } from 'sql/platform/query/common/queryModel';

import { ISelectionData, ExecutionPlanOptions } from 'azdata';
import { startsWith } from 'vs/base/common/strings';

const MAX_SIZE = 13;

function trimTitle(title: string): string {
	const length = title.length;
	const diff = length - MAX_SIZE;

	if (diff <= 0) {
		return title;
	} else {
		const start = (length / 2) - (diff / 2);
		return title.slice(0, start) + '...' + title.slice(start + diff, length);
	}
}

export interface IQueryEditorStateChange {
	connectedChange?: boolean;
	resultsVisibleChange?: boolean;
	executingChange?: boolean;
	connectingChange?: boolean;
	sqlCmdModeChanged?: boolean;
}

export class QueryEditorState extends Disposable {
	private _connected = false;
	private _isSqlCmdMode = false;
	private _resultsVisible = false;
	private _executing = false;
	private _connecting = false;

	private _onChange = this._register(new Emitter<IQueryEditorStateChange>());
	public onChange = this._onChange.event;

	public set connected(val: boolean) {
		if (val !== this._connected) {
			this._connected = val;
			this._onChange.fire({ connectedChange: true });
		}
	}

	public get connected(): boolean {
		return this._connected;
	}

	public set connecting(val: boolean) {
		if (val !== this._connecting) {
			this._connecting = val;
			this._onChange.fire({ connectingChange: true });
		}
	}

	public get connecting(): boolean {
		return this._connecting;
	}

	public set resultsVisible(val: boolean) {
		if (val !== this._resultsVisible) {
			this._resultsVisible = val;
			this._onChange.fire({ resultsVisibleChange: true });
		}
	}

	public get resultsVisible(): boolean {
		return this._resultsVisible;
	}

	public set executing(val: boolean) {
		if (val !== this._executing) {
			this._executing = val;
			this._onChange.fire({ executingChange: true });
		}
	}

	public get executing(): boolean {
		return this._executing;
	}

	public set isSqlCmdMode(val: boolean) {
		if (val !== this._isSqlCmdMode) {
			this._isSqlCmdMode = val;
			this._onChange.fire({ sqlCmdModeChanged: true });
		}
	}

	public get isSqlCmdMode(): boolean {
		return this._isSqlCmdMode;
	}
}

/**
 * Input for the QueryEditor. This input is simply a wrapper around a QueryResultsInput for the QueryResultsEditor
 * and a UntitledEditorInput for the SQL File Editor.
 */
export abstract class QueryEditorInput extends EditorInput implements IConnectableInput, IDisposable {

	public static SCHEMA: string = 'sql';

	private _state = this._register(new QueryEditorState());
	public get state(): QueryEditorState { return this._state; }

	constructor(
		private _description: string,
		protected _text: EditorInput,
		protected _results: QueryResultsInput,
		@IConnectionManagementService private readonly connectionManagementService: IConnectionManagementService,
		@IQueryModelService private readonly queryModelService: IQueryModelService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private _fileService: IFileService
	) {
		super();

		this._register(this._text);
		this._register(this._results);

		this._text.onDidChangeDirty(() => this._onDidChangeDirty.fire());

		this._register(
			this.queryModelService.onRunQueryStart(uri => {
				if (this.uri === uri) {
					this.onRunQuery();
				}
			})
		);

		this._register(
			this.queryModelService.onRunQueryComplete(uri => {
				if (this.uri === uri) {
					this.onQueryComplete();
				}
			})
		);

		this._register(this.connectionManagementService.onDisconnect(result => {
			if (result.connectionUri === this.uri) {
				this.onDisconnect();
			}
		}));

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectedKeys.indexOf('sql.showConnectionInfoInTitle') > -1) {
				this._onDidChangeLabel.fire();
			}
		}));

		this.connectionManagementService.ensureDefaultLanguageFlavor(this.uri);

		this.onDisconnect();
		this.onQueryComplete();
	}

	// Getters for private properties
	public get uri(): string { return this.getResource().toString(true); }
	public get text(): EditorInput { return this._text; }
	public get results(): QueryResultsInput { return this._results; }
	// Description is shown beside the tab name in the combobox of open editors
	public getDescription(): string { return this._description; }
	public supportsSplitEditor(): boolean { return false; }
	public revert(): Promise<boolean> { return this._text.revert(); }

	public matches(otherInput: any): boolean {
		// we want to be able to match against our underlying input as well, bascially we are our underlying input
		if (otherInput instanceof QueryEditorInput) {
			return this._text.matches(otherInput._text);
		} else {
			return this._text.matches(otherInput);
		}
	}

	// Forwarding resource functions to the inline sql file editor
	public save(): Promise<boolean> { return this._text.save(); }
	public isDirty(): boolean { return this._text.isDirty(); }
	public confirmSave(): Promise<ConfirmResult> { return this._text.confirmSave(); }
	public getResource(): URI { return this._text.getResource(); }

	public matchInputInstanceType(inputType: any): boolean {
		return (this._text instanceof inputType);
	}

	public inputFileExists(): Promise<boolean> {
		return this._fileService.exists(this.getResource());
	}

	public getName(longForm?: boolean): string {
		if (this.configurationService.getValue('sql.showConnectionInfoInTitle')) {
			let profile = this.connectionManagementService.getConnectionProfile(this.uri);
			let title = '';
			if (this._description && this._description !== '') {
				title = this._description + ' ';
			}
			if (profile) {
				if (profile.userName) {
					title += `${profile.serverName}.${profile.databaseName} (${profile.userName})`;
				} else {
					title += `${profile.serverName}.${profile.databaseName} (${profile.authenticationType})`;
				}
			} else {
				title += localize('disconnected', "disconnected");
			}
			return this._text.getName() + (longForm ? (' - ' + title) : ` - ${trimTitle(title)}`);
		} else {
			return this._text.getName();
		}
	}

	// Called to get the tooltip of the tab
	public getTitle(): string {
		return this.getName(true);
	}

	// State update funtions
	public runQuery(selection?: ISelectionData, executePlanOptions?: ExecutionPlanOptions): void {
		this.queryModelService.runQuery(this.uri, selection, this, executePlanOptions);
		this.state.executing = true;
	}

	public runQueryStatement(selection?: ISelectionData): void {
		this.queryModelService.runQueryStatement(this.uri, selection, this);
		this.state.executing = true;
	}

	public runQueryString(text: string): void {
		this.queryModelService.runQueryString(this.uri, text, this);
		this.state.executing = true;
	}

	public onConnectStart(): void {
		this.state.connecting = true;
		this.state.connected = false;
	}

	public onConnectReject(): void {
		this.state.connecting = false;
		this.state.connected = false;
	}

	public onConnectCanceled(): void {
		// If we're currently connecting and then cancel, set connected state to false
		// Otherwise, keep connected state as it was
		if (this.state.connecting) {
			this.state.connected = false;
		}
		this.state.connecting = false;
	}

	public onConnectSuccess(params?: INewConnectionParams): void {
		this.state.connected = true;
		this.state.connecting = false;

		let isRunningQuery = this.queryModelService.isRunningQuery(this.uri);
		if (!isRunningQuery && params && params.runQueryOnCompletion) {
			let selection: ISelectionData | undefined = params ? params.querySelection : undefined;
			if (params.runQueryOnCompletion === RunQueryOnConnectionMode.executeCurrentQuery) {
				this.runQueryStatement(selection);
			} else if (params.runQueryOnCompletion === RunQueryOnConnectionMode.executeQuery) {
				this.runQuery(selection);
			} else if (params.runQueryOnCompletion === RunQueryOnConnectionMode.estimatedQueryPlan) {
				this.runQuery(selection, { displayEstimatedQueryPlan: true });
			} else if (params.runQueryOnCompletion === RunQueryOnConnectionMode.actualQueryPlan) {
				this.runQuery(selection, { displayActualQueryPlan: true });
			}
		}
		this._onDidChangeLabel.fire();
	}

	public onDisconnect(): void {
		this.state.connected = false;
		this._onDidChangeLabel.fire();
	}

	public onRunQuery(): void {
		this.state.executing = true;
		this.state.resultsVisible = true;
	}

	public onQueryComplete(): void {
		this.state.executing = false;
	}

	public close(): void {
		this.queryModelService.disposeQuery(this.uri);
		this.connectionManagementService.disconnectEditor(this, true);

		this._text.close();
		this._results.close();
		super.close();
	}

	/**
	 * Get the color that should be displayed
	 */
	public get tabColor(): string {
		return this.connectionManagementService.getTabColorForUri(this.uri);
	}

	public get isSharedSession(): boolean {
		return !!(this.uri && startsWith(this.uri, 'vsls:'));
	}
}
