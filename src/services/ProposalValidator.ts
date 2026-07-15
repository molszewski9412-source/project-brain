import { ProjectProposal } from "../models/Proposal";
import { ProjectModule } from "../models/Module";


export class ProposalValidator {



	static validate(

		proposal:ProjectProposal,

		module:ProjectModule

	):ProjectProposal {



		if(

			module.locked

			||

			module.status === "LOCKED"

		){



			return {


				...proposal,


				status:"BLOCKED",


				reason:

				proposal.reason +

				"\n\nBLOCKED BY PROJECT RULES: Module is LOCKED and cannot be modified automatically."



			};


		}





		return proposal;



	}



}