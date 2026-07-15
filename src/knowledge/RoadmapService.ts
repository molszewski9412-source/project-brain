import * as fs from "fs";
import * as path from "path";

import * as vscode from "vscode";



export type RoadmapStatus =

	| "TODO"

	| "IN_PROGRESS"

	| "DONE"

	| "LOCKED";





export interface RoadmapItem {


	id:string;


	name:string;


	description:string;


	status:RoadmapStatus;


	dependsOn:string[];


}




export class RoadmapService {



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

			"roadmap.json"

		);


	}






	load():RoadmapItem[]{



		if(!fs.existsSync(this.file())){


			return [];


		}



		return JSON.parse(

			fs.readFileSync(

				this.file(),

				"utf8"

			)

		);



	}







	save(

		items:RoadmapItem[]

	){



		fs.writeFileSync(

			this.file(),

			JSON.stringify(

				items,

				null,

				2

			)

		);


	}



}