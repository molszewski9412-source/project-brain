import * as fs from "fs";
import * as path from "path";

import * as vscode from "vscode";



export interface ProjectKnowledge {


	vision:string;


	principles:string[];


	mvp:string[];


	future:string[];


}



export class KnowledgeService {



	private root:string;



	constructor(){


		const workspace =

		vscode.workspace.workspaceFolders?.[0];



		if(!workspace){

			throw new Error(
				"No workspace opened"
			);

		}



		this.root =

		workspace.uri.fsPath;


	}







	private getFolder(){


		return path.join(

			this.root,

			".projectbrain"

		);


	}







	private getFile(){


		return path.join(

			this.getFolder(),

			"knowledge.json"

		);


	}







	load():ProjectKnowledge{



		const file =

		this.getFile();





		if(!fs.existsSync(file)){


			return {


				vision:"",


				principles:[],


				mvp:[],


				future:[]


			};


		}






		return JSON.parse(

			fs.readFileSync(

				file,

				"utf8"

			)

		);


	}







	save(

		data:ProjectKnowledge

	){



		fs.writeFileSync(

			this.getFile(),

			JSON.stringify(

				data,

				null,

				2

			)

		);


	}



}