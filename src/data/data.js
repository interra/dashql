const dash = 
{
    "handle": "X",
    "title": "Philly 311 Data Visualized",
    "backend": "cartodb",
    "dataResources": [
        {
            "resourceHandle": "byServiceName",
            "comment": "**All imported data is assumed to be in cartodb sql api return value format",
            "dataResourceType": "cartodb",
            "url": "https://phl.carto.com/api/v2/sql",
            "query": "?q=SELECT service_name, COUNT(cartodb_id) FROM public_cases_fc WHERE service_name NOT IN ('Information Request') GROUP BY service_name ORDER BY count DESC LIMIT 10"
        }
    ],
    "filters": [
                {
                    "type": "Autocomplete",
                    "key": "include",
                    "label": "My Label",
                    "field": "service_name",
                    "multi": true,
                    "operation": "IN",
                    "options": [{"label":"foo", "value": "foo"},{"label":"bar", "value": "bar"}, {"label": "baz", "value": "baz"}]
                },
                {
                    "type": "Autocomplete",
                    "key": "exclude",
                    "label": "Number 2",
                    "field": "service_name",
                    "multi": true,
                    "operation": "NOTIN",
                    "options": [{"label":"a", "value": "a"},{"label":"b", "value": "b"}, {"label": "c", "value": "c"}]
                },
                {
                    "type": "Autocomplete",
                    "key": "start_date",
                    "label": "Start Date",
                    "field": "date",
                    "operation": "GTEQ"
                },
                {
                    "type": "Autocomplete",
                    "key": "end_date",
                    "label": "End Date",
                    "field": "date",
                    "operation": "LTEQ"
                }
            ],
        "regions": [
        {
            "id": "region-1",
            "children": [
                {
                    "type": "Metric",
                    "value": "A",
                    "key": "metric-a",
                    "background": "red",
                    "caption": "caption a",
                    "icon": "tree",
                    "cardProps": {
                        "cardClasses": ["col-md-3"]
                    } 
                },
                {
                    "type": "Metric",
                    "value": "B",
                    "key": "metric-b",
                    "background": "blue",
                    "caption": "caption b",
                    "icon": "rocket",
                    "cardProps": {
                        "cardClasses": ["col-md-3"]
                    } 
                },
                {
                    "type": "Metric",
                    "value": "C",
                    "key": "metric-c",
                    "background": "green",
                    "caption": "caption c",
                    "icon": "telegram",
                    "cardProps": {
                        "cardClasses": ["col-md-3"]
                    } 
                },
                {
                    "type": "Metric",
                    "value": "D",
                    "key": "metric-d",
                    "background": "black",
                    "caption": "caption d",
                    "icon": "shower",
                    "cardProps": {
                        "cardClasses": ["col-md-3"]
                    } 
                }
            ]
        },
        {
            "id": "region-2",
            "children": [
                {
                    "type": "Chart",
                    "key": "chart-1",
                    "dataType": "NVD3Series",
                    "dataFields": [
                        {
                            "fieldName": "x",
                            "dataResource": "byServiceName",
                            "dataResourceField": "service_name"
                        },
                        {
                            "fieldName": "y",
                            "dataResource": "byServiceName",
                            "dataResourceField": "count"
                        }
                    ],
                    "settings": {
                        "type": "pieChart",
                        "labelType": "key",
                        "labelSunbeamLayout": true,
                        "showLegend": false,
                        "donut": true,
                        "donutRatio": ".65",
                        "height": "800"
                    },
                    "cardProps": {
                        "header": "Request Type",
                        "subheader": "(excluding requests for information)",
                        "cardClasses": ["col-md-6"],
                        "iconClass": "fa fa-tree"
                    }
                },
                {
                    "type": "Chart",
                    "key": "chart-2",
                    "dataType": "NVD3Series",
                    "dataFields": [
                        {
                            "fieldName": "x",
                            "dataResource": "byServiceName",
                            "dataResourceField": "service_name"
                        },
                        {
                            "fieldName": "y",
                            "dataResource": "byServiceName",
                            "dataResourceField": "count"
                        }
                    ],
                    "settings": {
                        "type": "pieChart",
                        "labelType": "key",
                        "labelSunbeamLayout": true,
                        "showLegend": false,
                        "donut": true,
                        "donutRatio": ".65",
                        "height": "800"
                    },
                    "cardProps": {
                        "header": "Request Type",
                        "subheader": "(excluding requests for information)",
                        "cardClasses": ["col-md-6"],
                        "iconClass": "fa fa-tree"
                    }
                }
            ]
        }
    ]
}

const projects = [
		{ id: 1, name: 'Learn React Native' },
		{ id: 2, name: 'Workout' },
]

const tasks = [
		{ id: 1, title: 'Install Node', completed: true, projectID: 1 },
		{ id: 2, title: 'Install React Native CLI:', completed: false, projectID: 1 },
		{ id: 3, title: 'Install Xcode', completed: false, projectID: 1 },
		{ id: 4, title: 'Morning Jog', completed: true, projectID: 2 },
		{ id: 5, title: 'Visit the gym', completed: false, projectID: 2 }
]

module.exports = { projects, tasks, dash }
