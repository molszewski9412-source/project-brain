export type ModuleStatus =
	| "IDEA"
	| "PLANNED"
	| "IN_PROGRESS"
	| "REVIEW"
	| "DONE"
	| "LOCKED"
	| "ARCHIVED";


export interface ProjectModule {

	id: string;

	name: string;

	description: string;

	status: ModuleStatus;

	progress: number;

	locked: boolean;


	files: string[];


	dependsOn: string[];


	position: {

		x:number;

		y:number;

	};


	createdAt:string;

	updatedAt:string;

}