import * as vscode from "vscode";

import { KnowledgeService } from "../knowledge/KnowledgeService";
import { RoadmapService } from "../knowledge/RoadmapService";



export class KnowledgeProvider

implements vscode.TreeDataProvider<string>{



	private _onDidChangeTreeData =

	new vscode.EventEmitter<string | undefined>();



	readonly onDidChangeTreeData =

	this._onDidChangeTreeData.event;







	refresh(){

		this._onDidChangeTreeData.fire(undefined);

	}







	getTreeItem(

		element:string

	):vscode.TreeItem {



		const item = new vscode.TreeItem(

			element

		);



		return item;


	}







	getChildren():string[]{



		const result:string[] = [];



		try{



			const knowledge =

			new KnowledgeService();



			const roadmap =

			new RoadmapService();





			const data =

			knowledge.load();





			result.push(

				"📚 KNOWLEDGE"

			);





			result.push(

				"Vision: " + data.vision

			);





			result.push(

				""

			);





			result.push(

				"📌 PRINCIPLES"

			);





			for(const p of data.principles){


				result.push(

					"• " + p

				);


			}






			result.push(

				""

			);






			result.push(

				"🗺 ROADMAP"

			);





			for(const item of roadmap.load()){


				result.push(

					`${item.id} | ${item.name} | ${item.status}`

				);


			}



		}

		catch(error){



			result.push(

				"Project Brain not initialized"

			);


		}





		return result;



	}




}