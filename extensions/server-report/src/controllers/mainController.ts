/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as azdata from 'azdata';
import * as Utils from '../utils';
import ControllerBase from './controllerBase';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';


/**
 * The main controller class that initializes the extension
 */
export default class MainController extends ControllerBase {

	public apiWrapper;
	// PUBLIC METHODS //////////////////////////////////////////////////////
	/**
	 * Deactivates the extension
	 */
	public deactivate(): void {
		Utils.logDebug('Main controller deactivated');
	}

	public activate(): void {
		azdata.tasks.registerTask('tempdb.startEvent', async (profile: azdata.IConnectionProfile) => await this.onExecute(profile, 'startEvent.sql'));
		azdata.tasks.registerTask('tempdb.stopEvent', async (profile: azdata.IConnectionProfile) => await this.onExecute(profile, 'stopEvent.sql'));
		azdata.tasks.registerTask('tempdb.contention', async () => await vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/tempdbblog')));
		azdata.tasks.registerTask('tempdb.pauseEvent', async (profile: azdata.IConnectionProfile) => await this.stopAutoRefresh(profile));
	}

	private async onExecute(connection: azdata.IConnectionProfile, fileName: string): Promise<void> {
		//Command to start/stop autorefresh and run the query
		vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'type-of-contention', connection.id, true);
		vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'metadata-contention', connection.id, true);
		vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'allocation-contention', connection.id, true);
		const sqlContent = (await fs.readFile(path.join(__dirname, '..', '..', '..', 'sql', fileName))).toString();
		const doc = await vscode.workspace.openTextDocument({ language: 'sql', content: sqlContent });
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active, false);
		const filePath = doc.uri.toString();
		azdata.queryeditor.connect(filePath, connection.id).then(() => azdata.queryeditor.runQuery(filePath, undefined, false));
	}

	private async stopAutoRefresh(connection: azdata.IConnectionProfile): Promise<any> {
		return Promise.all([
			vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'type-of-contention', connection.id, false),
			vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'metadata-contention', connection.id, false),
			vscode.commands.executeCommand('azdata.widget.setAutoRefreshState', 'allocation-contention', connection.id, false)]
		);
	}
}
