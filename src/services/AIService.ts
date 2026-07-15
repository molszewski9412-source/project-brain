import { OllamaClient } from "../ai/OllamaClient";
import { PromptBuilder } from "../ai/PromptBuilder";
import { ProposalParser } from "../ai/ProposalParser";
import { ProposalService } from "./ProposalService";
import { ProjectModule } from "../models/Module";
import { ProjectDecision } from "../models/Decision";
import { ProposalValidator } from "./ProposalValidator";
import { ProjectScanResult } from "./ProjectScanner";





export class AIService {





	private client:OllamaClient;





	constructor(){


		this.client =

		new OllamaClient();


	}









	async analyzeModule(


		module:ProjectModule,


		decisions:ProjectDecision[],


		context?:string


	){





		const prompt =

		`

You are Project Brain AI Architect.

Analyze the module using project context.

Do not modify locked modules automatically.

Suggest improvements only.

Explain risks and dependencies.



${

context

?

context

:

"NO PROJECT CONTEXT AVAILABLE"

}





MODULE ANALYSIS:


${

PromptBuilder.moduleAnalysis(

	module

)

}





DECISIONS:


${

decisions

.filter(

d => d.moduleId === module.id

)

.map(

d =>

d.title + ": " + d.reason

)

.join("\n")

}





Provide analysis using this exact structure:


1. FACTS

2. OBSERVATIONS

3. RISKS

4. SUGGESTIONS

5. MODIFICATION AUTHORIZATION

6. REQUIRED DECISIONS

7. PROPOSAL



`;








		const result =

		await this.client.ask(

			prompt

		);







		if(result.success){



			const proposal =

			ProposalParser.parse(

				result.content,

				module.id

			);






			if(proposal){



				const validatedProposal =

				ProposalValidator.validate(

					proposal,

					module

				);






				const proposalService =

				new ProposalService();





				proposalService.add(

					validatedProposal

				);


			}



		}







		return result;



	}













	async analyzeProject(

		scan:ProjectScanResult

	){



		const prompt =

		PromptBuilder.projectAnalysis(

			scan

		);






		const result =

		await this.client.ask(

			prompt

		);







		if(!result.success){



			return result;



		}








		try {



			const clean =

			result.content

			.replace(

				/```json/g,

				""

			)

			.replace(

				/```/g,

				""

			)

			.trim();







			const parsed =

			JSON.parse(

				clean

			);








			return {


				success:true,


				content:result.content,


				analysis:parsed



			};




		}

		catch(error){





			return {


				success:false,


				error:

				"AI returned invalid JSON",


				content:result.content



			};




		}



	}








}