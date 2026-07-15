export interface ModuleLink {

	id:string;


	source:string;


	target:string;


	type:
	"DEPENDENCY"
	|
	"DATA_FLOW"
	|
	"REFERENCE";


	createdAt:string;

}