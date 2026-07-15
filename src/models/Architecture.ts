export interface Architecture {


	projectName:string;


	description:string;


	vision:string;



	technologyStack:string[];



	modules:ArchitectureModule[];



	roadmap:RoadmapItem[];



	decisions:any[];



	risks:string[];



	ideas:string[];



	createdAt:string;



	updatedAt:string;



}



export interface ArchitectureModule {


	id:string;


	name:string;


	description:string;


	status:string;


	progress:number;



	dependsOn:string[];



	files:string[];



}



export interface RoadmapItem {


	id:string;


	title:string;


	description:string;



	status:
	"TODO"
	|
	"IN_PROGRESS"
	|
	"DONE";



	dependsOn:string[];



}