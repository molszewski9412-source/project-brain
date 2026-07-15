export interface AIResponse {


	success:boolean;


	content:string;


	error?:string;


}



export interface AIClient {


	ask(

		prompt:string

	):Promise<AIResponse>;


}