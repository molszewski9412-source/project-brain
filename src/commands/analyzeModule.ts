import * as vscode from 'vscode';

import { ProjectStore } from '../storage/projectStore';
import { AIService } from '../services/AIService';

import { ContextBuilder } from '../ai/ContextBuilder';




export async function analyzeModule(

	moduleId?:string

){



	const store =

	new ProjectStore();





	const modules =

	store.loadModules();







	if(!moduleId){



		const selected =

		await vscode.window.showQuickPick(


			modules.map(

				m => ({


					label:m.name,


					description:m.status,


					id:m.id


				})

			),


			{


				placeHolder:

				"Select module to analyze"


			}


		);





		if(!selected){


			return;


		}





		moduleId = selected.id;


	}









	const module =

	modules.find(

		m => m.id === moduleId

	);







	if(!module){



		vscode.window.showErrorMessage(


			"Module not found"


		);



		return;



	}







	vscode.window.showInformationMessage(


		`🤖 Analyzing ${module.name}`


	);









	try {





		const context =

		ContextBuilder.buildModuleContext(

			module

		);








		const ai =

		new AIService();







		const result =

		await ai.analyzeModule(

			module,

			[],


			context


		);









		if(!result.success){



			vscode.window.showErrorMessage(


				result.error ??

				"AI error"


			);



			return;



		}









		const panel =

		vscode.window.createWebviewPanel(


			"projectBrainAI",


			`🤖 ${module.name} Analysis`,


			vscode.ViewColumn.Two,


			{


				enableScripts:true


			}


		);









		panel.webview.html = `



<html>

<body style="padding:20px;font-family:Arial">



<h1>

🤖 AI Analysis

</h1>



<h2>

${module.name}

</h2>




<pre style="white-space:pre-wrap">

${result.content}

</pre>




</body>

</html>


`;





	}



	catch(error){





		vscode.window.showErrorMessage(


			"AI connection error: " + error


		);



	}



}