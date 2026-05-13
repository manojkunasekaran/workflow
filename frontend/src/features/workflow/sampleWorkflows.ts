/**
 * Sample workflow templates for testing different task types
 */

/**
 * Basic HTTP + Conditional workflow
 */
export const SAMPLE_HTTP_CONDITIONAL_WORKFLOW = {
    name: "Test API Workflow",
    tasks: [
        {
            taskId: "fetch_users",
            type: "HTTP_TASK",
            parameters: {
                type: "HTTP_TASK",
                url: "{{$variables.json_placeholder_api_base_url}}/users/1",
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        },
        {
            taskId: "check_user",
            type: "CONDITIONAL",
            parameters: {
                type: "CONDITIONAL",
                branches: [
                    {
                        name: "User Found",
                        rules: {
                            operator: "AND",
                            conditions: [
                                {
                                    field: "{{$tasks.fetch_users.statusCode}}",
                                    operator: "EQUALS",
                                    value: "{{$variables.success_status_code}}"
                                }
                            ]
                        },
                        nextTaskId: "create_post"
                    }
                ],
                defaultNextTaskId: null
            }
        },
        {
            taskId: "create_post",
            type: "HTTP_TASK",
            parameters: {
                type: "HTTP_TASK",
                url: "{{$variables.json_placeholder_api_base_url}}/posts",
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    title: "Post by {{$tasks.fetch_users.body.name}}",
                    body: "Email: {{$tasks.fetch_users.body.email}}",
                    userId: "{{$tasks.fetch_users.body.id}}"
                }
            }
        }
    ],
    variables: {
        json_placeholder_api_base_url: {
            type: "STRING",
            value: "https://jsonplaceholder.typicode.com"
        },
        success_status_code: {
            type: "NUMBER",
            value: 200
        }
    }
};

/**
 * Array Iterator workflow - loops over a list of user IDs
 */
export const SAMPLE_ARRAY_ITERATOR_WORKFLOW = {
    name: "Loop Over Users - Array Iteration",
    tasks: [
        {
            taskId: "fetch_multiple_users",
            type: "ITERATOR_TASK",
            parameters: {
                type: "ITERATOR_TASK",
                loopOver: [1, 2, 3, 4, 5],
                actions: [
                    {
                        taskId: "fetch_user_detail",
                        type: "HTTP_TASK",
                        parameters: {
                            type: "HTTP_TASK",
                            url: "{{$variables.json_placeholder_api_base_url}}/users/{{$loop.item}}",
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    }
                ]
            }
        }
    ],
    variables: {
        json_placeholder_api_base_url: {
            type: "STRING",
            value: "https://jsonplaceholder.typicode.com"
        },
        success_status_code: {
            type: "NUMBER",
            value: 200
        }
    }
};

/**
 * Object Iterator workflow - loops over environment configurations
 */
export const SAMPLE_OBJECT_ITERATOR_WORKFLOW = {
    name: "Loop Over Environments - Object Iteration",
    tasks: [
        {
            taskId: "fetch_httpbin_detail_in_loop",
            type: "ITERATOR_TASK",
            parameters: {
                type: "ITERATOR_TASK",
                loopOver: {
                    "staging": "1",
                    "production": "2"
                },
                actions: [
                    {
                        taskId: "fetch_httpbin_detail_in_loop",
                        type: "HTTP_TASK",
                        parameters: {
                            type: "HTTP_TASK",
                            url: "{{$variables.httpbin_url}}/get",
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Environment": "{{$loop.key}}",
                                "X-User-Id": "{{$loop.value}}"
                            }
                        }
                    }
                ]
            }
        }
    ],
    variables: {
        httpbin_url: {
            type: "STRING",
            value: "https://httpbin.org"
        },
        success_status_code: {
            type: "NUMBER",
            value: 200
        }
    }
};

/**
 * Number Iterator workflow - retry logic
 */
export const SAMPLE_NUMBER_ITERATOR_WORKFLOW = {
    name: "Retry Request 5 Times - Number Iteration",
    tasks: [
        {
            taskId: "retry_request",
            type: "ITERATOR_TASK",
            parameters: {
                type: "ITERATOR_TASK",
                loopOver: 5,
                actions: [
                    {
                        taskId: "attempt_request",
                        type: "HTTP_TASK",
                        parameters: {
                            type: "HTTP_TASK",
                            url: "https://httpbin.org/status/200,500",
                            method: "GET",
                            headers: {
                                "X-Attempt": "{{$loop.index}}"
                            }
                        }
                    }
                ]
            }
        }
    ],
    variables: {}
};

/**
 * Basic Script Task workflow - returns object and logs
 */
export const SAMPLE_SCRIPT_BASIC_WORKFLOW = {
    name: "Basic Script Execution",
    tasks: [
        {
            taskId: "transform_data",
            type: "SCRIPT_TASK",
            parameters: {
                type: "SCRIPT_TASK",
                language: "javascript",
                script: "console.log('Starting data transformation');\nlet result = { message: 'Hello from script!', timestamp: new Date().toISOString(), numbers: [1, 2, 3] };\nconsole.log('Data structure generated');\nreturn result;"
            }
        }
    ],
    variables: {}
};

/**
 * Script Task accessing Context Variables and HTTP Response
 */
export const SAMPLE_SCRIPT_CONTEXT_WORKFLOW = {
    name: "Script Accessing Context & HTTP Data",
    tasks: [
        {
            taskId: "fetch_user",
            type: "HTTP_TASK",
            parameters: {
                type: "HTTP_TASK",
                url: "{{$variables.api_url}}/users/1",
                method: "GET",
                headers: { "Content-Type": "application/json" }
            }
        },
        {
            taskId: "process_user_data",
            type: "SCRIPT_TASK",
            parameters: {
                type: "SCRIPT_TASK",
                language: "javascript",
                script: "console.log('\\n--- Accessing Context Variables ---');\nlet user = $tasks.fetch_user?.result || $tasks.fetch_user?.body;\nlet multiplier = $variables.score_multiplier;\n\nconsole.log('Fetched User:', JSON.stringify(user));\n\nif (!user) {\n  console.error('User data not found in context!');\n  return { success: false, reason: 'No user data' };\n}\n\nlet processedData = {\n  candidateName: user.name,\n  contactInfo: user.email + ' / ' + user.phone,\n  computedScore: Number(user.id) * Number(multiplier),\n  company: user.company?.name || 'Unknown'\n};\n\nconsole.log('Successfully processed user ' + user.id);\nreturn processedData;"
            }
        }
    ],
    variables: {
        api_url: {
            type: "STRING",
            value: "https://jsonplaceholder.typicode.com"
        },
        score_multiplier: {
            type: "NUMBER",
            value: 42
        }
    }
};

/**
 * Data Transform workflow - fetches users and uses JsonPath to extract a specific array
 */
export const SAMPLE_DATA_TRANSFORM_WORKFLOW = {
    name: "Zero-Code Data Transformation",
    tasks: [
        {
            taskId: "fetch_users",
            type: "HTTP_TASK",
            parameters: {
                type: "HTTP_TASK",
                url: "https://jsonplaceholder.typicode.com/users",
                method: "GET",
                headers: { "Content-Type": "application/json" }
            }
        },
        {
            taskId: "extract_emails",
            type: "DATA_TRANSFORM",
            parameters: {
                type: "DATA_TRANSFORM",
                operation: "JSON_EXTRACT",
                inputData: "{{$tasks.fetch_users.body}}",
                expression: "$[*].email"
            }
        }
    ],
    variables: {}
};

/**
 * All sample workflows as an array for easy selection
 */
export const ALL_SAMPLES = [
    { name: "HTTP + Conditional", workflow: SAMPLE_HTTP_CONDITIONAL_WORKFLOW },
    { name: "Array Iterator", workflow: SAMPLE_ARRAY_ITERATOR_WORKFLOW },
    { name: "Object Iterator", workflow: SAMPLE_OBJECT_ITERATOR_WORKFLOW },
    { name: "Number Iterator (Retry)", workflow: SAMPLE_NUMBER_ITERATOR_WORKFLOW },
    { name: "Simple Script Output", workflow: SAMPLE_SCRIPT_BASIC_WORKFLOW },
    { name: "Script using HTTP & Vars", workflow: SAMPLE_SCRIPT_CONTEXT_WORKFLOW },
    { name: "JSONPath Data Transform", workflow: SAMPLE_DATA_TRANSFORM_WORKFLOW }
];
