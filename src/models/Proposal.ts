export type ProposalStatus =

	| "WAITING_APPROVAL"
	| "APPROVED"
	| "REJECTED"
	| "IMPLEMENTED"
	| "BLOCKED";





export type ProposalType =

	| "IMPROVEMENT"
	| "BUG_FIX"
	| "ARCHITECTURE_CHANGE"
	| "NEW_FEATURE";







export interface ProjectProposal {



	id:string;



	moduleId:string;



	type:ProposalType;



	title:string;



	description:string;



	reason:string;



	risk:string;



	status:ProposalStatus;



	createdAt:string;



	updatedAt:string;



}