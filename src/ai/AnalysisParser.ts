import { ProjectAnalysis } from "../models/ProjectAnalysis";



export class AnalysisParser {



	static parse(

		content:string

	):ProjectAnalysis {



		return {


			projectName:

			"Analyzed Project",



			summary:

			this.extractSection(

				content,

				"OBSERVATIONS"

			),



			modules:

			this.extractModules(

				content

			),



			technologyStack:

			this.extractTechnologyStack(

				content

			),



			risks:

			this.extractListSection(

				content,

				"RISKS"

			),



			recommendations:

			this.extractListSection(

				content,

				"SUGGESTIONS"

			)


		};


	}









	private static extractSection(

		content:string,

		title:string

	):string {



		const regex = new RegExp(

			`##\\s*${title}[\\s\\S]*?(?=##|$)`,

			"i"

		);



		const match = content.match(regex);



		if(!match){

			return "";

		}



		return match[0]

		.replace(

			new RegExp(

				`##\\s*${title}`,

				"i"

			),

			""

		)

		.trim();



	}









	private static extractListSection(

		content:string,

		title:string

	):string[]{



		const section =

		this.extractSection(

			content,

			title

		);





		return section

		.split("\n")

		.map(x=>

			x

			.replace(/^\d+\.\s*/,"")

			.replace(/^[-*]\s*/,"")

			.replace(/\*\*/g,"")

			.trim()

		)

		.filter(x=>x.length>0);


	}









	private static extractModules(

		content:string

	):any[]{



		const section =

		this.extractSection(

			content,

			"MODULES"

		);





		if(!section){

			return [];

		}







		const modules:any[] = [];







		const blocks =

		section

		.split(/###/)

		.map(x=>x.trim())

		.filter(x=>x);









		for(const block of blocks){



			let name = "";

			let description = "";

			let status = "PLANNED";









			// NAME: Core

			let match =

			block.match(

				/NAME:\s*(.*)/i

			);



			if(match){


				name =

				match[1]

				.replace(/\*/g,"")

				.trim();


			}









			// ### Core

			if(!name){



				const firstLine =

				block

				.split("\n")[0]

				.trim();




				name =

				firstLine

				.replace(/\*/g,"")

				.trim();



			}









			const descMatch =

			block.match(

				/(DESCRIPTION|Description):\s*(.*)/i

			);



			if(descMatch){



				description =

				descMatch[2]

				.replace(/\*/g,"")

				.trim();



			}











			const statusMatch =

			block.match(

				/(STATUS|Status):\s*(.*)/i

			);





			if(statusMatch){



				status =

				statusMatch[2]

				.replace(/\*/g,"")

				.trim();



			}









			if(name){



				modules.push({



					name,


					description,


					status



				});



			}





		}








		return modules;



	}









	private static extractTechnologyStack(

		content:string

	):string[]{



		const result:string[] = [];



		const techSection =

		this.extractSection(

			content,

			"TECHNOLOGIES"

		);



		if(!techSection){

			return result;

		}




		return techSection

		.split("\n")

		.map(x=>

			x

			.replace(/^[-*]\s*/,"")

			.trim()

		)

		.filter(x=>x);



	}



}