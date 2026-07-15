import * as fs from "fs";
import * as path from "path";

import * as vscode from "vscode";



export interface StatusRule {


	meaning:string;


	allowedActions?:string[];


	forbiddenActions?:string[];


}




export interface ProjectRules {


	moduleStatuses:{

		[key:string]:StatusRule;

	};


	principles:string[];


}




export class RulesService {



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







	private file(){


		return path.join(

			this.root,

			".projectbrain",

			"rules.json"

		);


	}









	load():ProjectRules{





		if(!fs.existsSync(this.file())){


			return {


				moduleStatuses:{},


				principles:[]


			};


		}





		return JSON.parse(


			fs.readFileSync(

				this.file(),

				"utf8"

			)


		);




	}









	getStatusRule(

		status:string

	):StatusRule | undefined{



		const rules =

		this.load();





		return rules.moduleStatuses[status];


	}







	getPrinciples():string[]{



		return this.load().principles;



	}





}