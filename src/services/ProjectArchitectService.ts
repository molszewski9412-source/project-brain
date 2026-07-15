import { ProjectScanner, ProjectScanResult } from "./ProjectScanner";
import { ProjectArchitectPrompt } from "../ai/ProjectArchitectPrompt";
import { OllamaClient } from "../ai/OllamaClient";




export class ProjectArchitectService {




	private scanner:ProjectScanner;


	private ai:OllamaClient;





	constructor(){


		this.scanner =

		new ProjectScanner();



		this.ai =

		new OllamaClient();


	}







	async analyzeProject(

		description:string = ""

	){



		const scan:ProjectScanResult =

		await this.scanner.scan();





		const prompt =

		ProjectArchitectPrompt.build(

			scan,

			description

		);







		const result =

		await this.ai.ask(

			prompt

		);






		return {


			scan,


			result


		};



	}




}