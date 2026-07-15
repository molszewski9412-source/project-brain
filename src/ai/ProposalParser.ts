import {

	ProjectProposal

} from "../models/Proposal";





export class ProposalParser {




	static parse(

		text:string,

		moduleId:string

	):ProjectProposal | null {



		if(!text.includes("<PROPOSAL>")){


			return null;


		}





		const section =

		text.split(

			"<PROPOSAL>"

		)[1];






		const get = (

			key:string

		)=>{



			const regex =

			new RegExp(

				key +

				"\\s*:\\s*\\n?\\s*(.*)",

				"i"

			);






			const match =

			section.match(regex);






			return match

			?

			match[1].trim()

			:

			"";



		};








		return {



			id:

			"PROP-" +

			Date.now(),






			moduleId,







			type:

            (get("TYPE") || "IMPROVEMENT").toUpperCase() as any,






			title:

			get("TITLE"),







			description:

			get("DESCRIPTION"),







			reason:

			get("REASON"),







			risk:

			get("RISK"),







			status:

			"WAITING_APPROVAL",







			createdAt:

			new Date().toISOString(),







			updatedAt:

			new Date().toISOString()



		};



	}



}