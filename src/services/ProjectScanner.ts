import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";



export interface ProjectScanResult {


	rootPath:string;


	files:string[];


	folders:string[];


	technologies:string[];


	configFiles:string[];


}





export class ProjectScanner {





	async scan():Promise<ProjectScanResult>{



		const workspace =

		vscode.workspace.workspaceFolders?.[0];





		if(!workspace){


			throw new Error(

				"No workspace opened"

			);


		}





		const root =

		workspace.uri.fsPath;





		const result:ProjectScanResult = {


			rootPath:root,


			files:[],


			folders:[],


			technologies:[],


			configFiles:[]


		};






		this.walkDirectory(

			root,

			root,

			result

		);





		this.detectTechnologies(

			result

		);






		return result;



	}









	private walkDirectory(



		current:string,


		root:string,


		result:ProjectScanResult



	){





		const entries =

		fs.readdirSync(

			current,

			{

				withFileTypes:true

			}

		);






		for(const entry of entries){





			// ignore system folders



			if(

				entry.name === "node_modules" ||

				entry.name === ".git" ||

				entry.name === ".projectbrain" ||

				entry.name === "dist" ||

				entry.name === "build"

			){


				continue;


			}






			const fullPath =

			path.join(

				current,

				entry.name

			);








			const relative =

			path.relative(

				root,

				fullPath

			);









			if(entry.isDirectory()){



				result.folders.push(

					relative

				);



				this.walkDirectory(

					fullPath,

					root,

					result

				);



			}

			else {



				result.files.push(

					relative

				);



				if(

					this.isConfigFile(

						entry.name

					)

				){


					result.configFiles.push(

						relative

					);


				}



			}




		}



	}









	private isConfigFile(

		name:string

	):boolean {



		const configs = [



			"package.json",


			"tsconfig.json",


			"requirements.txt",


			"pyproject.toml",


			"pom.xml",


			"Cargo.toml",


			"go.mod",


			"composer.json"



		];




		return configs.includes(

			name

		);



	}









	private detectTechnologies(

		result:ProjectScanResult

	){





		const files =

		result.files.join(

			" "

		).toLowerCase();






		const configs =

		result.configFiles.join(

			" "

		).toLowerCase();









		if(

			files.includes(

				".tsx"

			)

			||

			files.includes(

				".jsx"

			)

		){



			result.technologies.push(

				"React"

			);


		}






		if(

			configs.includes(

				"package.json"

			)

		){


			result.technologies.push(

				"Node.js / JavaScript ecosystem"

			);


		}






		if(

			files.includes(

				".py"

			)

		){



			result.technologies.push(

				"Python"

			);


		}







		if(

			files.includes(

				".cs"

			)

		){



			result.technologies.push(

				".NET / C#"

			);


		}






	}






}