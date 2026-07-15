import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { ProjectModule } from '../models/Module';
import { ModuleLink } from '../models/Link';
import { HistoryEntry } from '../models/History';
import { ProjectDecision } from '../models/Decision';
import { ProjectProposal } from '../models/Proposal';
import { ProjectInfo } from '../models/ProjectInfo';





export class ProjectStore {




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







	private getBrainFolder():string {



		return path.join(

			this.root,

			".projectbrain"

		);



	}







	private getFile(

		name:string

	):string {



		return path.join(

			this.getBrainFolder(),

			name

		);



	}








	private readJson<T>(

		file:string,

		defaultValue:T

	):T {



		if(!fs.existsSync(file)){


			return defaultValue;


		}





		const data =

		fs.readFileSync(

			file,

			"utf8"

		);





		return JSON.parse(data);



	}







	private writeJson<T>(

		file:string,

		data:T

	){



		const folder =

		this.getBrainFolder();



		if(!fs.existsSync(folder)){


			fs.mkdirSync(

				folder,

				{
					recursive:true
				}

			);


		}



		fs.writeFileSync(

			file,

			JSON.stringify(

				data,

				null,

				2

			)

		);



	}







	// PROJECT INFO





	loadProjectInfo():ProjectInfo | null {



		return this.readJson<ProjectInfo | null>(

			this.getFile(

				"project.json"

			),

			null

		);



	}







	saveProjectInfo(

		info:ProjectInfo

	){



		this.writeJson(

			this.getFile(

				"project.json"

			),

			info

		);



	}







	createDefaultProjectInfo():ProjectInfo {



		const workspace =

		vscode.workspace.workspaceFolders?.[0];



		return {


			projectName:

			workspace

			?

			workspace.name

			:

			"Unknown Project",



			description:"",



			initialized:false,



			createdAt:

			new Date()

			.toISOString(),



			updatedAt:

			new Date()

			.toISOString(),



			rootPath:

			this.root,



			technologyStack:[]



		};



	}









	// MODULES





	loadModules():ProjectModule[]{



		return this.readJson<ProjectModule[]>(

			this.getFile(

				"modules.json"

			),

			[]

		);



	}







	saveModules(

		modules:ProjectModule[]

	){



		this.writeJson(

			this.getFile(

				"modules.json"

			),

			modules

		);



	}







	updateModule(

		updatedModule:ProjectModule

	){



		const modules =

		this.loadModules();





		const index =

		modules.findIndex(

			m =>

			m.id === updatedModule.id

		);





		if(index === -1){


			throw new Error(

				"Module not found"

			);


		}





		modules[index] = {

			...updatedModule,

			updatedAt:

			new Date()

			.toISOString()

		};





		this.saveModules(

			modules

		);



	}








	// LINKS





	loadLinks():ModuleLink[]{



		return this.readJson<ModuleLink[]>(

			this.getFile(

				"links.json"

			),

			[]

		);



	}







	saveLinks(

		links:ModuleLink[]

	){



		this.writeJson(

			this.getFile(

				"links.json"

			),

			links

		);



	}








	// HISTORY





	loadHistory():HistoryEntry[]{



		return this.readJson<HistoryEntry[]>(

			this.getFile(

				"history.json"

			),

			[]

		);



	}







	saveHistory(

		history:HistoryEntry[]

	){



		this.writeJson(

			this.getFile(

				"history.json"

			),

			history

		);



	}







	addHistory(

		entry:HistoryEntry

	){



		const history =

		this.loadHistory();





		history.push(

			entry

		);





		this.saveHistory(

			history

		);



	}








	// DECISIONS





	loadDecisions():ProjectDecision[]{



		return this.readJson<ProjectDecision[]>(

			this.getFile(

				"decisions.json"

			),

			[]

		);



	}







	saveDecisions(

		decisions:ProjectDecision[]

	){



		this.writeJson(

			this.getFile(

				"decisions.json"

			),

			decisions

		);



	}







	addDecision(

		decision:ProjectDecision

	){



		const decisions =

		this.loadDecisions();





		decisions.push(

			decision

		);





		this.saveDecisions(

			decisions

		);



	}








	// PROPOSALS





	loadProposals():ProjectProposal[]{



		return this.readJson<ProjectProposal[]>(

			this.getFile(

				"proposals.json"

			),

			[]

		);



	}







	saveProposals(

		proposals:ProjectProposal[]

	){



		this.writeJson(

			this.getFile(

				"proposals.json"

			),

			proposals

		);



	}





}