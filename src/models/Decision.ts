export type DecisionType =

	| "ARCHITECTURE"
	| "DESIGN"
	| "PERFORMANCE"
	| "SECURITY"
	| "OTHER";




export interface ProjectDecision {


	id:string;


	moduleId:string;


	type:DecisionType;


	title:string;


	description:string;


	reason:string;


	createdAt:string;


	createdBy:

	"USER"
	|
	"AI";


}