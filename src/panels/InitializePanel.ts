import * as vscode from "vscode";



export class InitializePanel {



	public static currentPanel:
	InitializePanel | undefined;



	private panel:vscode.WebviewPanel;




	private constructor(

		panel:vscode.WebviewPanel

	){


		this.panel = panel;


		this.panel.webview.html =

		this.getHtml();



		this.panel.webview.onDidReceiveMessage(

			message=>{


				if(message.command === "initialize"){



					vscode.commands.executeCommand(

						"project-brain.initializeWizardSubmit",

						message.data

					);



				}



			}

		);



	}







	public static createOrShow(){



		if(InitializePanel.currentPanel){



			InitializePanel.currentPanel.panel.reveal();


			return;


		}





		const panel =

		vscode.window.createWebviewPanel(

			"projectBrainInitialize",

			"🧠 Initialize Project",

			vscode.ViewColumn.One,

			{

				enableScripts:true

			}

		);





		InitializePanel.currentPanel =

		new InitializePanel(

			panel

		);




	}








	private getHtml(){



		return `

<!DOCTYPE html>

<html>

<body style="font-family:Arial;padding:25px">


<h1>
🧠 Project Brain Setup
</h1>


<h3>
Choose initialization method
</h3>



<label>

<input 
type="radio"
name="mode"
value="scan"
checked>

🔍 Analyze Existing Project

</label>


<br><br>


<label>

<input 
type="radio"
name="mode"
value="idea">


✨ Create From Idea

</label>



<br><br><br>



<h3>
Project description
</h3>


<textarea

id="description"

style="
width:100%;
height:120px;
">

</textarea>



<br><br>



<button id="start">

🚀 Initialize

</button>





<script>


const vscode =
acquireVsCodeApi();



document
.getElementById("start")
.addEventListener(

"click",

()=>{


const mode =

document.querySelector(
'input[name="mode"]:checked'
).value;



const description =

document.getElementById(
"description"
).value;




vscode.postMessage({

command:"initialize",

data:{

mode,

description

}

});


}

);


</script>



</body>

</html>

`;

	}



}