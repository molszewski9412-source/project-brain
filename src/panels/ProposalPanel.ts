import * as vscode from "vscode";

import { ProjectProposal } from "../models/Proposal";
import { ProposalService } from "../services/ProposalService";



export class ProposalPanel {



	private static currentPanel:
	ProposalPanel | undefined;



	private panel:
	vscode.WebviewPanel;



	private proposal:
	ProjectProposal;







	private constructor(

		panel:vscode.WebviewPanel,

		proposal:ProjectProposal

	){



		this.panel = panel;

		this.proposal = proposal;



		this.update();





		this.panel.onDidDispose(()=>{


			ProposalPanel.currentPanel = undefined;


		});






		this.panel.webview.onDidReceiveMessage(

			async message=>{


				if(message.command === "updateStatus"){



					const service =

					new ProposalService();




					await service.updateStatus(

						this.proposal.id,

						message.status

					);




					this.proposal.status =

					message.status;



					this.update();



				}



			}

		);



	}










	static createOrShow(

		proposal:ProjectProposal

	){



		const column =

		vscode.ViewColumn.One;






		if(ProposalPanel.currentPanel){



			ProposalPanel.currentPanel.panel.reveal(

				column

			);



			ProposalPanel.currentPanel.proposal = proposal;



			ProposalPanel.currentPanel.update();



			return;



		}






		const panel =

		vscode.window.createWebviewPanel(


			"projectBrainProposal",


			`📋 ${proposal.title}`,


			column,


			{

				enableScripts:true

			}


		);







		ProposalPanel.currentPanel =

		new ProposalPanel(

			panel,

			proposal

		);



	}









	private update(){



		this.panel.webview.html =

		this.getHtml(

			this.proposal

		);



	}









	private getHtml(

		p:ProjectProposal

	):string {



		return `



<!DOCTYPE html>

<html>


<body style="padding:20px;font-family:Arial">



<h1>

📋 AI Proposal

</h1>




<h2>

${p.title}

</h2>




<hr>




<h3>Status</h3>

<p>

${p.status}

</p>




<h3>Type</h3>

<p>

${p.type}

</p>




<h3>Description</h3>

<p>

${p.description}

</p>




<h3>Reason</h3>

<p>

${p.reason}

</p>




<h3>Risk</h3>

<p>

${p.risk}

</p>





<hr>





<button onclick="approve()">

✅ APPROVE

</button>



<button onclick="reject()">

❌ REJECT

</button>





<script>


const vscode = acquireVsCodeApi();




function approve(){


	vscode.postMessage({

		command:"updateStatus",

		status:"APPROVED"

	});


}





function reject(){


	vscode.postMessage({

		command:"updateStatus",

		status:"REJECTED"

	});


}



</script>




</body>

</html>



`;



	}



}