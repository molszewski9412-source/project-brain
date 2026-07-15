export interface ProjectAnalysis {


	projectName:string;



	summary:string;



	modules:{


		name:string;


		description:string;


		status:string;


	}[];




	technologyStack:string[];




	risks:string[];




	recommendations:string[];




}