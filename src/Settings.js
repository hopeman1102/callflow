import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import NameValueList from "./NameValueList.js"
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import WFUtils from './WFUtils.js'
import PropTypes from 'prop-types';

import Box from '@material-ui/core/Box';

const WFShape_CallIcon = '\uf0ac';
const WFShape_AssignIcon = '\uf061';
const WFShape_SwitchIcon = '\uf047';
const WFShape_ReturnIcon = '\uf00c';

/**
 * <Settings wf=<Object>/>
 * 
 * The wf should be a Workflow object.
 */
class Settings extends React.Component {

    /**
     * 
     * @param {*} props 
     * 
     * wf: object
     */
    constructor(props) {
        super(props);
        let state = {
            valid: false
        };
        if (props.wf) {
            state = this.parseWF(props.wf); // Set the state from the parse of the WF object
            console.dir(this.state);
            delete this.parseFailed;
        } else {
            console.error("!Expected a wf object in Settings");
            this.parseFailed = true;
        }
        state._error_stepName = false;
        this.state = state;

    }

    componentDidMount() {
        this._validate()
    }

    _validate() {
        let valid = true;
        if (this.state.stepName.length === 0) {
            this.setState({ _error_stepName: true, _error_message_stepName: 'Can not be empty' });
            valid = false;
        } else {
            this.setState({ _error_stepName: false, _error_message_stepName: null });
        }
        if (this.state.type === "call") {
            if (this.state.functionName.length === 0) {
                this.setState({ _error_functionName: true, _error_message_functionName: 'Can not be empty' });
                valid = false;
            } else {
                this.setState({ _error_functionName: false, _error_message_functionName: null });
            }
        } else if (this.state.type === "return") {
            if (this.state["return"].length === 0) {
                this.setState({ _error_return: true, _error_message_return: 'Can not be empty' });
                valid = false;
            } else {
                this.setState({ _error_return: false, _error_message_return: null });
            }
        } else if (this.state.type === "switch") {
            this.state.items.forEach((item, index) => {
                if (item.value.length === 0) { // Cant' have an empty condition.
                    valid = false;
                    return;
                }
                this.state.items.forEach((item2, index2) => { // Can't have duplicate conditions.
                    if (index !== index2 && item.value === item2.value) {
                        valid = false;
                        console.log(`Duplicate: ${item.value}`);
                    }
                });
            });
        }
        this.setState({ valid });
        if (this.props.onValidate) {
            this.props.onValidate(valid);
        }
    }

    /**
     * Parse a WF object and return the core information.
     * @param {*} wf 
     * @returns 
     * 
     * Call
     * {
  <stepName>: {
    "call": <functionName>,
    "args": {
      <arg1>: <value1>,
      ...
    },
    "result": <varName>
  }
}
     */
    parseWF(wf) {
        let stepName = WFUtils.getStepName(wf);
        let step = wf[stepName];
        const stepType = WFUtils.getStepType(wf);
        /**
         * {
                <stepName>: {
                    "call": <functionName>,
                    "args": {
                    <arg1>: <value1>,
                    ...
                    },
                    "result": <varName>
                }
            }
         */
        if (stepType === "call") {
            // It is a call
            let functionName = step.call;
            let result = step.result ? step.result : "";

            let items = [];
            if (step.args) {
                Object.getOwnPropertyNames(step.args).forEach((propertyName) => {
                    items.push({
                        name: propertyName,
                        value: step.args[propertyName]
                    })
                });
            }
            return {
                type: "call",
                stepName,
                functionName,
                result,
                items
            };
        }

        /*
        {
            <stepName>: {
                "assign": [
                    {
                        <varName>: <varValue>
                    },
                    ...
                ]
            }
        }
        */
        if (stepType === "assign") {
            let items = [];
            if (step.assign) {
                step.assign.forEach((item) => {
                    Object.getOwnPropertyNames(item).forEach((propertyName) => {
                        items.push({
                            name: propertyName,
                            value: item[propertyName]
                        })
                    });
                })
            }
            return {
                type: "assign",
                stepName,
                items: items
            }
        }

        if (stepType === "switch") {
            let items = [];
            step.switch.forEach((item) => {
                items.push({ value: item.condition });
            })
            return {
                type: "switch",
                stepName,
                items: items
            }
        }

        if (stepType === "return") {
            let returnValue = step["return"] ? step["return"] : "";
            return {
                type: "return",
                stepName,
                "return": returnValue
            }
        }
        return {};
    }

    /**
     * Return a WF object from the core information.
     * @returns 
     */
    toWF() {
        let step = {};
        let wf = {}
        wf[this.state.stepName] = step;
        //
        // Call
        //
        if (this.state.type === "call") {
            step["call"] = this.state.functionName;
            if (this.state.result && this.state.result.length > 0) {
                step["result"] = this.state.result;
            }
            if (this.state.items.length > 0) {
                let args = {};
                step["args"] = args;
                this.state.items.forEach((item) => {
                    args[item.name] = item.value;
                });
            }
            return wf;
        }

        //
        // Assign
        //
        if (this.state.type === "assign") {
            step["assign"] = [];
            this.state.items.forEach((item) => {
                step["assign"].push({ [item.name]: item.value })
            });
            return wf;
        }

        //
        // Switch
        //
        /*
        {
  <stepName>: {
    "switch": [
      {
        "condition": "${EXPRESSION_A}",
        "next": "STEP_NAME_B"
      },
      {
        "condition": "${EXPRESSION_B}",
        "next": "STEP_NAME_C"
      }
      ...
    ],
    "next": "STEP_NAME_D"
  }
}
        */
        if (this.state.type === "switch") {
            step["switch"] = [];
            this.state.items.forEach((item) => {
                step["switch"].push({ condition: item.value });
            });
            return wf;
        }

        if (this.state.type === "return") {
            step["return"] = this.state["return"];
            return wf;
        }
        return wf;
    }

    _settingsChanged() {
        console.log("Settings changed");
        console.dir(this.toWF());
        this._validate();
        this.props.onChange(this.toWF());
    }

    _callArgsChange(items) {
        console.log("CallArgsChange");
        this.setState({ items }, this._settingsChanged);
    }

    _assignArgsChange(items) {
        this.setState({ items }, this._settingsChanged);
    }

    _switchArgsChange(items) {
        this.setState({ items }, this._settingsChanged);
    }

    _typeChange(newType) {
        // A new type means to clear all existing items.
        const newValues = {
            type: newType,
            items: []
        }

        if (newType === "call") {
            newValues.functionName = "";
        }
        if (newType === "return") {
            newValues["return"] = "";
        }
        this.setState(newValues, this._settingsChanged);
    } // _typeChange

    render() {
        /*
        if (this.parseFailed) {
            return <div>PARSE FAILED</div>
        }
        */
        return (
            <Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField label='Step Name' value={this.state.stepName} fullWidth
                            inputProps={{
                                spellCheck: 'false'
                            }}
                            variant="outlined"
                            error={this.state._error_stepName} helperText={this.state._error_message_stepName}
                            required
                            onChange={
                                (e) => {
                                    this.setState({ stepName: e.target.value }, this._settingsChanged)
                                }
                            }
                        ></TextField>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="type" value={this.state.type}
                            inputProps={{
                                spellCheck: 'false'
                            }}
                            variant="outlined"
                            select onChange={
                                (e) => {
                                    this._typeChange(e.target.value)
                                }
                            }>
                            <MenuItem value={"call"}><Typography component="span" style={{ fontFamily: "fontawesome" }}>{WFShape_CallIcon}</Typography>&nbsp;Call</MenuItem>
                        </TextField>
                    </Grid>

                </Grid>

                {this.state.type === "call" ?
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField value={this.state.functionName} label="Function Name" fullWidth
                                inputProps={{
                                    spellCheck: 'false'
                                }}
                                error={this.state._error_functionName} helperText={this.state._error_message_functionName}
                                variant="outlined"
                                required
                                onChange={(e) => {
                                    this.setState({ functionName: e.target.value }, this._settingsChanged);
                                }}
                            />
                        </Grid>
                    </Grid>
                    : ""
                }
                {this.state.type === "assign" ?
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <NameValueList items={this.state.items}
                                onChange={this._assignArgsChange.bind(this)} />
                        </Grid>
                    </Grid> : ""
                }
                {this.state.type === "switch" ?
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <NameValueList items={this.state.items}
                                hideNames
                                onChange={this._switchArgsChange.bind(this)} />
                        </Grid>
                    </Grid> : ""
                }
                {this.state.type === "return" ?
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField value={this.state["return"]} label="Return" fullWidth
                                required
                                error={this.state._error_return} helperText={this.state._error_message_return}
                                inputProps={{
                                    spellCheck: 'false'
                                }}
                                variant="outlined"
                                onChange={(e) => {
                                    this.setState({ "return": e.target.value }, this._settingsChanged);
                                }} />
                        </Grid>
                    </Grid> : ""
                }
            </Box>);
    }
}

Settings.propTypes = {
    wf: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired
};

export default Settings;