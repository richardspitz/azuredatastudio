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
		azdata.tasks.registerTask('sp_whoisactive.install', async () => await vscode.env.openExternal(vscode.Uri.parse('http://whoisactive.com/downloads/')));
		azdata.tasks.registerTask('sp_whoisactive.documentation', async () => await vscode.env.openExternal(vscode.Uri.parse('http://whoisactive.com/docs/')));
		azdata.tasks.registerTask('sp_whoisactive.findBlockLeaders', async (profile: azdata.IConnectionProfile) => await this.onExecute(profile, 'findBlockLeaders.sql'));
		azdata.tasks.registerTask('sp_whoisactive.getPlans', async (profile: azdata.IConnectionProfile) => await this.onExecute(profile, 'getPlans.sql'));
	}

	private async onExecute(profile: azdata.IConnectionProfile, fileName: string): Promise<void> {
		const sqlContent = (await fs.readFile(path.join(__dirname, '..', '..', '..', 'sql', fileName))).toString();
		const doc = await vscode.workspace.openTextDocument({ language: 'sql', content: sqlContent });
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active, false);
		const filePath = doc.uri.toString();
		azdata.queryeditor.connect(filePath, profile.id).then(() => azdata.queryeditor.runQuery(filePath));
	}
}
