import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { Architecture } from "../models/Architecture";



export class ArchitectureStore {



	private getFolder(){


		const workspace =
		vscode.workspace.workspaceFolders?.[0];


		if(!workspace){

			throw new Error(
				"No workspace"
			);

		}



		const folder =
		path.join(
			workspace.uri.fsPath,
			".projectbrain"
		);



		if(!fs.existsSync(folder)){


			fs.mkdirSync(folder);


		}



		return folder;


	}





	private getFile(){


		return path.join(

			this.getFolder(),

			"architecture.json"

		);


	}






	save(

		architecture:Architecture

	){


		fs.writeFileSync(

			this.getFile(),

			JSON.stringify(

				architecture,

				null,

				2

			)

		);


	}







	load():

	Architecture | null {


		const file =
		this.getFile();



		if(!fs.existsSync(file)){


			return null;


		}




		return JSON.parse(

			fs.readFileSync(

				file,

				"utf8"

			)

		);



	}



}