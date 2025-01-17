/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorInputFactory, IEditorInputFactoryRegistry, Extensions as EditorInputExtensions } from 'vs/workbench/common/editor';
import { Registry } from 'vs/platform/registry/common/platform';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';
import { FILE_EDITOR_INPUT_ID } from 'vs/workbench/contrib/files/common/files';
import { FileNotebookInput } from 'sql/workbench/contrib/notebook/common/models/fileNotebookInput';
import { UntitledNotebookInput } from 'sql/workbench/contrib/notebook/common/models/untitledNotebookInput';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';

const editorInputFactoryRegistry = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories);

export class FileNoteBookEditorInputFactory implements IEditorInputFactory {
	serialize(editorInput: FileNotebookInput): string {
		const factory = editorInputFactoryRegistry.getEditorInputFactory(FILE_EDITOR_INPUT_ID);
		if (factory) {
			return factory.serialize(editorInput.textInput); // serialize based on the underlying input
		}
		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): FileNotebookInput | undefined {
		const factory = editorInputFactoryRegistry.getEditorInputFactory(FILE_EDITOR_INPUT_ID);
		const fileEditorInput = factory.deserialize(instantiationService, serializedEditorInput) as FileEditorInput;
		return instantiationService.createInstance(FileNotebookInput, fileEditorInput.getName(), fileEditorInput.getResource(), fileEditorInput);
	}
}

export class UntitledNoteBookEditorInputFactory implements IEditorInputFactory {
	serialize(editorInput: UntitledNotebookInput): string {
		const factory = editorInputFactoryRegistry.getEditorInputFactory(UntitledEditorInput.ID);
		if (factory) {
			return factory.serialize(editorInput.textInput); // serialize based on the underlying input
		}
		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): UntitledNotebookInput | undefined {
		const factory = editorInputFactoryRegistry.getEditorInputFactory(UntitledEditorInput.ID);
		const untitledEditorInput = factory.deserialize(instantiationService, serializedEditorInput) as UntitledEditorInput;
		return instantiationService.createInstance(UntitledNotebookInput, untitledEditorInput.getName(), untitledEditorInput.getResource(), untitledEditorInput);
	}
}
