import * as vscode from 'vscode';

import { ProjectStore } from '../storage/projectStore';
import { ProjectModule } from '../models/Module';
import { ProposalService } from '../services/ProposalService';
import { ProjectProposal } from '../models/Proposal';



export class ProjectBrainProvider
implements vscode.TreeDataProvider<ProjectBrainItem> {



	private _onDidChangeTreeData =
		new vscode.EventEmitter<ProjectBrainItem | undefined | null>();



	readonly onDidChangeTreeData =
		this._onDidChangeTreeData.event;



	private store: ProjectStore;



	constructor(){

		this.store = new ProjectStore();

	}





	refresh(){

		this._onDidChangeTreeData.fire(null);

	}






	getTreeItem(

		element: ProjectBrainItem

	): vscode.TreeItem {


		return element;

	}







	getChildren(

		element?: ProjectBrainItem

	): Thenable<ProjectBrainItem[]> {



		// ROOT

		if(!element){



			const modules =

			new ProjectBrainItem(

				"🧩 Modules",

				"modules"

			);



			modules.collapsibleState =

			vscode.TreeItemCollapsibleState.Expanded;





			return Promise.resolve([

				modules

			]);



		}







		// MODULE LIST



		if(element.type === "modules"){



			let modules:ProjectModule[] = [];



			try{


				modules =

				this.store.loadModules();


			}

			catch(error){


				return Promise.resolve([]);


			}






			return Promise.resolve(


				modules.map(

					module=>{


						const item =

						new ProjectBrainItem(


							this.getIcon(

								module.status

							)

							+

							" "

							+

							module.name,


							module


						);





						item.collapsibleState =

						vscode.TreeItemCollapsibleState.Collapsed;






						item.command = {


							command:

							"project-brain.openModule",


							title:

							"Open Module",


							arguments:[

								module

							]


						};





						return item;



					}


				)


			);



		}







		// MODULE CHILDREN - PROPOSALS



		if(

			element.data &&

			typeof element.data !== "string"

		){



			const module =

			element.data as ProjectModule;





			const proposalService =

			new ProposalService();





			const proposals =

			proposalService.getForModule(

				module.id

			);






			return Promise.resolve(


				proposals.map(

					proposal=>{


						const item =

						new ProjectBrainItem(


							this.getProposalIcon(

								proposal

							)

							+

							" "

							+

							proposal.title,


							proposal


						);







						item.command = {


							command:

							"project-brain.openProposal",


							title:

							"Open Proposal",


							arguments:[

								proposal

							]


						};







						return item;



					}


				)


			);



		}







		return Promise.resolve([]);



	}









	private getIcon(

		status:string

	):string {



		switch(status){



			case "LOCKED":

				return "🔒";



			case "DONE":

				return "🟢";



			case "IN_PROGRESS":

				return "🟡";



			case "PLANNED":

				return "🔵";



			case "IDEA":

				return "💡";



			default:

				return "⚪";



		}



	}








	private getProposalIcon(

		proposal:ProjectProposal

	):string {



		switch(proposal.status){



			case "BLOCKED":

				return "🔒";



			case "APPROVED":

				return "✅";



			case "REJECTED":

				return "❌";



			case "IMPLEMENTED":

				return "🚀";



			default:

				return "🟡";



		}



	}



}








class ProjectBrainItem

extends vscode.TreeItem {



	public type?:string;





	constructor(

		label:string,

		public data?:

		ProjectModule

		|

		ProjectProposal

		|

		string


	){



		super(

			label,

			vscode.TreeItemCollapsibleState.None

		);





		if(data === "modules"){


			this.type = "modules";


		}






		if(

			data &&

			typeof data === "object"

		){



			if(

				"id" in data &&

				"name" in data

			){


				this.type = "module";


			}



		}






		this.tooltip = label;



	}



}