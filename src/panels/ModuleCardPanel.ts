import * as vscode from 'vscode';
import { ProjectModule } from '../models/Module';
import { HistoryEntry } from '../models/History';
import { ProjectDecision } from '../models/Decision';



export class ModuleCardPanel {



	public static currentPanel:
	ModuleCardPanel | undefined;



	private readonly panel:
	vscode.WebviewPanel;



	private constructor(

		panel:vscode.WebviewPanel,

		module:ProjectModule,

		history:HistoryEntry[],

		decisions:ProjectDecision[]

	){


		this.panel = panel;


		this.update(

			module,

			history,

			decisions

		);




		this.panel.onDidDispose(()=>{


			ModuleCardPanel.currentPanel =
			undefined;


		});






		this.panel.webview.onDidReceiveMessage(

			message => {



				if(message.command === "save"){



					vscode.commands.executeCommand(

						"project-brain.updateModule",

						message.module

					);


				}




				if(message.command === "addDecision"){



					vscode.commands.executeCommand(

						"project-brain.addDecision",

						module.id

					);


				}

                if(message.command === "analyze"){


	                vscode.commands.executeCommand(

		                "project-brain.analyzeModule",

	                	module.id

	                );


                }


			}

		);



	}








	public static createOrShow(

		module:ProjectModule,

		history:HistoryEntry[],

		decisions:ProjectDecision[]

	){



		const column =

		vscode.ViewColumn.One;






		if(ModuleCardPanel.currentPanel){



			ModuleCardPanel.currentPanel.panel.reveal(

				column

			);



			ModuleCardPanel.currentPanel.update(

				module,

				history,

				decisions

			);



			return;

		}






		const panel =

		vscode.window.createWebviewPanel(

			"projectBrainModule",

			`🧠 ${module.name}`,

			column,

			{

				enableScripts:true

			}

		);







		ModuleCardPanel.currentPanel =

		new ModuleCardPanel(

			panel,

			module,

			history,

			decisions

		);



	}









	private update(

		module:ProjectModule,

		history:HistoryEntry[],

		decisions:ProjectDecision[]

	){


		this.panel.webview.html =

		this.getHtml(

			module,

			history,

			decisions

		);


	}









	private getHtml(

		module:ProjectModule,

		history:HistoryEntry[],

		decisions:ProjectDecision[]

	):string {



		const historyHtml =



		history

		.filter(

			h => h.target === module.id

		)

		.reverse()

		.map(

			h => `


<div class="history-item">

<b>${h.action}</b>

<br>

${h.description}

<br>

<small>

${new Date(h.timestamp).toLocaleString()}

</small>

</div>


`

		)

		.join("")

		||

		"<i>No history yet</i>";







		const decisionHtml =



		decisions

		.filter(

			d => d.moduleId === module.id

		)

		.reverse()

		.map(

			d => `


<div class="decision-item">


<b>

${d.type}

</b>


<br>


${d.title}


<br>


${d.description}


<br>


<strong>
Reason:
</strong>

${d.reason}


<br>


<small>

${new Date(d.createdAt).toLocaleString()}

</small>


</div>


`

		)

		.join("")

		||

		"<i>No decisions yet</i>";









		return `


<!DOCTYPE html>

<html>


<head>


<style>


body{

font-family:Arial;

padding:20px;

}



.card{

border:1px solid #555;

border-radius:12px;

padding:20px;

}



input,textarea,select{

width:100%;

margin-bottom:12px;

padding:8px;

}



button{

padding:10px 20px;

cursor:pointer;

}



.section{

margin-top:30px;

}



.history-item,
.decision-item{

border-left:3px solid #777;

padding:10px;

margin-bottom:10px;

}



</style>


</head>


<body>



<div class="card">


<h1>

🧠 ${module.name}

</h1>




<label>Status</label>


<select id="status">


${

[
"IDEA",
"PLANNED",
"IN_PROGRESS",
"REVIEW",
"DONE",
"LOCKED",
"ARCHIVED"

]

.map(

s =>

`

<option ${module.status===s?"selected":""}>

${s}

</option>

`

)

.join("")

}


</select>




<label>Progress</label>


<input

id="progress"

type="number"

value="${module.progress}"

>




<label>Description</label>


<textarea id="description">

${module.description}

</textarea>





<button onclick="save()">

💾 SAVE

</button>





<div class="section">


<h2>

📜 History

</h2>


${historyHtml}


</div>







<div class="section">


<h2>

🧩 Decisions

</h2>



${decisionHtml}



<br>


<button onclick="addDecision()">

➕ Add Decision

</button>

<br><br>


<button onclick="analyze()">

🤖 Analyze Module

</button>

</div>



</div>








<script>


const vscode = acquireVsCodeApi();




function save(){



vscode.postMessage({

command:"save",


module:{


...${JSON.stringify(module)},


status:

document.getElementById("status").value,


progress:

Number(

document.getElementById("progress").value

),


description:

document.getElementById("description").value


}


});


}





function addDecision(){


vscode.postMessage({

command:"addDecision"


});


}

function analyze(){


vscode.postMessage({

command:"analyze"


});


}

</script>



</body>

</html>


`;

	}



}