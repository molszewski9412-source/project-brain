import * as vscode from 'vscode';
import { ProjectDecision } from '../models/Decision';
import { ProjectStore } from '../storage/projectStore';



export async function addDecision(

	moduleId:string

){



	const title =

	await vscode.window.showInputBox({

		prompt:
		"Decision title"

	});



	if(!title){

		return;

	}





	const description =

	await vscode.window.showInputBox({

		prompt:
		"Description"

	});



	if(!description){

		return;

	}





	const reason =

	await vscode.window.showInputBox({

		prompt:
		"Why this decision?"

	});



	if(!reason){

		return;

	}





	const decision:ProjectDecision = {


		id:

		Date.now().toString(),



		moduleId,



		type:

		"ARCHITECTURE",



		title,



		description,



		reason,



		createdAt:

		new Date().toISOString(),



		createdBy:

		"USER"


	};





	const store =

	new ProjectStore();



	store.addDecision(

		decision

	);





	vscode.window.showInformationMessage(

		"🧩 Decision added"

	);


}