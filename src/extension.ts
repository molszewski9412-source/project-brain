import * as vscode from 'vscode';

import { ProjectBrainProvider } from './providers/ProjectBrainProvider';
import { KnowledgeProvider } from './providers/KnowledgeProvider';

import { initializeProject } from './commands/initializeProject';
import { ModuleCardPanel } from './panels/ModuleCardPanel';
import { InitializePanel } from './panels/InitializePanel';

import { ProjectDashboardProvider } from './providers/ProjectDashboardProvider';

import { ProjectStore } from './storage/projectStore';

import { ProposalPanel } from './panels/ProposalPanel';

import { addDecision } from './commands/addDecision';

import { analyzeModule } from './commands/analyzeModule';

import { ProjectArchitectService } from './services/ProjectArchitectService';
import { analyzeProject } from './commands/analyzeProject';
import { AnalysisParser } from './ai/AnalysisParser';







export function activate(

	context:vscode.ExtensionContext

){



	console.log(

		'🧠 Project Brain activated'

	);






	const provider =

	new ProjectBrainProvider();





	const dashboardProvider =

	new ProjectDashboardProvider();





	const knowledgeProvider =

	new KnowledgeProvider();







	context.subscriptions.push(



		vscode.window.registerTreeDataProvider(


			'projectBrainView',


			provider


		)



	);




	context.subscriptions.push(

	vscode.commands.registerCommand(

		"project-brain.analyzeProject",

		async()=>{


			await analyzeProject();


			provider.refresh();

			dashboardProvider.refresh();


		}

	)

);


	context.subscriptions.push(



		vscode.window.registerTreeDataProvider(


			'projectBrainDashboard',


			dashboardProvider


		)



	);







	context.subscriptions.push(



		vscode.window.registerTreeDataProvider(


			'projectBrainKnowledgeView',


			knowledgeProvider


		)



	);









	// OPEN INITIALIZE WIZARD


	context.subscriptions.push(


		vscode.commands.registerCommand(


			'project-brain.createProject',


			()=>{


				InitializePanel.createOrShow();


			}


		)


	);









	// INITIALIZE RESULT


	context.subscriptions.push(


		vscode.commands.registerCommand(


			'project-brain.initializeWizardSubmit',


			async(data)=>{



				console.log(

					"Initialize data:",

					data

				);





				initializeProject();





				provider.refresh();


				dashboardProvider.refresh();


				knowledgeProvider.refresh();





				vscode.window.showInformationMessage(


					"🧠 Project Brain initialized"


				);



			}


		)


	);









	// ANALYZE PROJECT WITH AI


	context.subscriptions.push(


		vscode.commands.registerCommand(


			"project-brain.analyzeProject",


			async()=>{


				try {



					const service =

					new ProjectArchitectService();






					const result =

					await service.analyzeProject();






					const analysis =

AnalysisParser.parse(

	result.result.content

);



console.log(
	"===== AI RAW RESPONSE ====="
);


console.log(
	result.result.content
);


console.log(
	"===== PARSED MODULES ====="
);


console.log(
	analysis.modules
);







					const panel =

					vscode.window.createWebviewPanel(


						"projectBrainAIProject",


						"🤖 Project Architecture Analysis",


						vscode.ViewColumn.Two,


						{


							enableScripts:true


						}


					);







					panel.webview.html = `



<html>

<body style="font-family:Arial;padding:20px">


<h1>

🤖 Project Brain Analysis

</h1>




<h2>

🔍 Scan

</h2>


<p>

Files:
${result.scan.files.length}

</p>



<p>

Technologies:

${

result.scan.technologies.join(", ")

}

</p>




<hr>





<h2>

🧩 Modules

</h2>



<pre style="white-space:pre-wrap">


${

analysis.modules

.map(

m =>


`${m.name}


${m.description}


Status:

${m.status}`


)

.join("\n\n")

}



</pre>







<h2>

⚠️ Risks

</h2>



<pre style="white-space:pre-wrap">


${

analysis.risks.join("\n")

}


</pre>







<h2>

💡 Suggestions

</h2>



<pre style="white-space:pre-wrap">


${

analysis.recommendations.join("\n")

}


</pre>







</body>

</html>


`;





				}

				catch(error){



					vscode.window.showErrorMessage(


						"Project analysis error: " + error


					);



				}



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			'project-brain.openModule',


			(module)=>{



				const store =

				new ProjectStore();





				const history =

				store.loadHistory();





				const decisions =

				store.loadDecisions();







				ModuleCardPanel.createOrShow(


					module,


					history,


					decisions


				);



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			'project-brain.updateModule',


			(module)=>{



				const store =

				new ProjectStore();





				store.updateModule(


					module


				);





				provider.refresh();





				vscode.window.showInformationMessage(


					"✅ Module updated"


				);



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			"project-brain.addDecision",


			(moduleId)=>{



				addDecision(

					moduleId

				);



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			"project-brain.analyzeModule",


			async(moduleId)=>{



				await analyzeModule(


					moduleId


				);



				provider.refresh();



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			"project-brain.openProposal",


			(proposal)=>{



				ProposalPanel.createOrShow(


					proposal


				);



			}


		)


	);









	context.subscriptions.push(


		vscode.commands.registerCommand(


			'project-brain.openMap',


			()=>{



				vscode.window.showInformationMessage(


					'🗺 Architecture Map coming soon'


				);



			}


		)


	);





}







export function deactivate(){

}