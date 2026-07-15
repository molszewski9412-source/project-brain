import { AIClient, AIResponse } from './AIClient';



export class OllamaClient

implements AIClient {



	private url:string;


	private model:string;





	constructor(){


		this.url =

		"http://localhost:11434";



		this.model =

		"qwen2.5-coder:3b";


	}







	async ask(

		prompt:string

	):Promise<AIResponse>{



		try{



			const response =

			await fetch(

				`${this.url}/api/generate`,

				{


					method:

					"POST",



					headers:{


						"Content-Type":

						"application/json"


					},




					body:JSON.stringify({

	model:
	this.model,

	prompt,

	stream:false,

	options:{

		temperature:0.2

	}

})


				}

			);






			if(!response.ok){



				return {


					success:false,


					content:"",


					error:

					`Ollama HTTP error: ${response.status}`


				};


			}







			const raw = await response.text();


let data:any;


try {


	data = JSON.parse(raw);


}

catch(error){


	console.log(
		"Ollama RAW RESPONSE:"
	);


	console.log(raw);



	return {


		success:false,


		content:"",


		error:

		"Invalid JSON from Ollama"



	};


}






			if(!data.response){



				return {


					success:false,


					content:"",


					error:

					"No response from model"


				};


			}








			return {



				success:true,



				content:

				data.response



			};




		}

		catch(error){



			return {



				success:false,



				content:"",



				error:

				"Ollama connection failed: "

				+

				String(error)



			};


		}



	}


}