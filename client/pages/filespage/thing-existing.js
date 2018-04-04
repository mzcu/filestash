import React from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';

import './thing.scss';
import { Card, NgIf, Icon, EventEmitter, Prompt } from '../../components/';
import { pathBuilder } from '../../helpers/';

const fileSource = {
    beginDrag(props, monitor, component) {
        return {
            path: props.path,
            name: props.file.name,
            type: props.file.type
        };
    },
    canDrag(props, monitor){
        return props.file.icon === 'loading'? false : true;
    },
    endDrag(props, monitor, component){
        if(monitor.didDrop() && component.state.icon !== 'loading'){
            let result = monitor.getDropResult();
            if(result.action === 'rename'){
                props.emit.apply(component, ['file.rename'].concat(result.args));
            }else{
                throw 'unknown action';
            }
        }
    }
};

const fileTarget = {
    canDrop(props, monitor){
        let file = monitor.getItem();
        if(props.file.type === 'directory' && file.name !== props.file.name){
            return true;
        }else{
            return false;
        }
    },
    drop(props, monitor, component){
        let src = monitor.getItem();
        let dest = props.file;

        let from = pathBuilder(props.path, src.name, src.type);
        let to = pathBuilder(props.path, './'+dest.name+'/'+src.name, src.type);
        return {action: 'rename', args: [from, to, src.type], ctx: 'existingfile'};
    }
};

const nativeFileTarget = {
    canDrop: fileTarget.canDrop,
    drop(props, monitor){
        let files = monitor.getItem().files;
        let path = pathBuilder(props.path, props.file.name, 'directory');
        props.emit('file.upload', path, files);
    }
}


@EventEmitter
@DropTarget('__NATIVE_FILE__', nativeFileTarget, (connect, monitor) => ({
    connectDropNativeFile: connect.dropTarget(),
    nativeFileIsOver: monitor.isOver(),
    canDropNativeFile: monitor.canDrop()
}))
@DropTarget('file', fileTarget, (connect, monitor) => ({
    connectDropFile: connect.dropTarget(),
    fileIsOver: monitor.isOver(),
    canDropFile: monitor.canDrop()
}))
@DragSource('file', fileSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
}))
export class ExistingThing extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            hover: null,
            message: null,
            filename: props.file.name,
            delete_request: false,
            delete_message: "Confirm by tapping \""+this._confirm_delete_text()+"\"",
            delete_error: ''
        };
    }

    onSelect(){
        if(this.state.icon !== 'loading' && this.state.icon !== 'error'){
            this.props.emit(
                'file.select',
                pathBuilder(this.props.path, this.props.file.name, this.props.file.type),
                this.props.file.type
            );
        }
    }

    onRename(newFilename){
        if(this.state.icon !== 'loading' && this.state.icon !== 'error'){
            this.props.emit(
                'file.rename',
                pathBuilder(this.props.path, this.props.file.name),
                pathBuilder(this.props.path, newFilename),
                this.props.file.type
            );
        }
    }

    onDeleteRequest(filename){
        this.setState({delete_request: true});
    }
    onDeleteConfirm(answer){
        if(answer === this._confirm_delete_text()){
            this.setState({icon: 'loading', delete_request: false});
            this.props.emit(
                'file.delete',
                pathBuilder(this.props.path, this.props.file.name),
                this.props.file.type
            );
        }else{
            this.setState({delete_error: "Doesn't match"});
        }
    }
    onDeleteCancel(){
        this.setState({delete_request: false});
    }
    _confirm_delete_text(){
        return this.props.file.name.length > 16? this.props.file.name.substring(0, 10).toLowerCase() : this.props.file.name;
    }


    render(highlight){
        const { connectDragSource, connectDropFile, connectDropNativeFile } = this.props;
        let className = "";
        if(this.props.isDragging) {
            className += "is-dragging ";
        }
        if(this.state.hover === true){
            className += "mouse-is-hover ";
        }
        if((this.props.fileIsOver && this.props.canDropFile) || (this.props.nativeFileIsOver && this.props.canDropNativeFile)) {
            className += "file-is-hover ";
        }
        className = className.trim();

        return connectDragSource(connectDropNativeFile(connectDropFile(
            <div className="component_thing">
              <Card className={this.state.hover} onClick={this.onSelect.bind(this)} onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})} className={className}>
                <DateTime show={this.state.hover !== true || this.state.icon === 'loading'} timestamp={this.props.file.time} />
                <Updater filename={this.props.file.name}
                         icon={this.props.file.icon || this.props.file.type}
                         can_move={this.props.file.can_move !== false}
                         can_delete={this.props.file.can_delete !== false}
                         show={this.state.hover === true && this.state.icon !== 'loading' && !('ontouchstart' in window)}
                         onRename={this.onRename.bind(this)}
                         onDelete={this.onDeleteRequest.bind(this)} />
                <FileSize type={this.props.file.type} size={this.props.file.size} />
                <Message message={this.state.message} />
              </Card>
              <Prompt appear={this.state.delete_request} error={this.state.delete_error} message={this.state.delete_message} onCancel={this.onDeleteCancel.bind(this)} onSubmit={this.onDeleteConfirm.bind(this)}/>
            </div>
        )));
    }
}
ExistingThing.PropTypes = {
    connectDragSource: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    fileIsOver: PropTypes.bool.isRequired,
    nativeFileIsOver: PropTypes.bool.isRequired,
    canDropFile: PropTypes.bool.isRequired,
    canDropNativeFile: PropTypes.bool.isRequired
}

class Updater extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            editing: null
        };
    }

    onRename(e){
        e.preventDefault();
        this.props.onRename(this.state.editing);
        this.setState({editing: null});
    }

    onDelete(e){
        e.stopPropagation();
        this.props.onDelete();
    }


    onRenameRequest(e){
        e.stopPropagation();
        if(this.state.editing === null){
            this.setState({editing: this.props.filename});
        }else{
            this.setState({editing: null});
        }
    }


    preventSelect(e){
        e.stopPropagation();
    }

    render(){
        return (
            <span className="component_updater">
              <NgIf className="action" cond={this.props.show}>
                <NgIf cond={this.props.can_move} type="inline">
                  <Icon name="edit" onClick={this.onRenameRequest.bind(this)} className="component_updater--icon" />
                </NgIf>
                <NgIf cond={this.props.can_delete !== false} type="inline">
                  <Icon name="delete" onClick={this.onDelete.bind(this)} className="component_updater--icon"/>
                </NgIf>
              </NgIf>
              <Icon className="component_updater--icon" name={this.props.icon} />
              <span className="file-details">
                <NgIf cond={this.state.editing === null} type='inline'>{this.props.filename}</NgIf>
                <NgIf cond={this.state.editing !== null} type='inline'>
                  <form onClick={this.preventSelect} onSubmit={this.onRename.bind(this)}>
                    <input value={this.state.editing} onChange={(e) => this.setState({editing: e.target.value})} autoFocus />
                  </form>
                </NgIf>
              </span>
            </span>
        );
    }
}

const DateTime = (props) => {
    function displayTime(timestamp){
        function padding(number){
            let str = String(number),
                pad = "00";
            return pad.substring(0, pad.length - str.length) + str;
        }
        if(timestamp){
            let t = new Date(timestamp);
            return padding(t.getDate()) + '/'+ padding(t.getMonth()) + '/' + padding(t.getFullYear());
        }else{
            return '';
        }
    }

    return (
        <NgIf cond={props.show} className="component_datetime">
          <span>{displayTime(props.timestamp)}</span>
        </NgIf>
    );
};

const FileSize = (props) => {
    function displaySize(bytes){
        if(Number.isNaN(bytes) || bytes === undefined){
            return "";
        }else if(bytes < 1024){
            return "("+bytes+'B'+")";
        }else if(bytes < 1048576){
            return "("+Math.round(bytes/1024*10)/10+'KB'+")";
        }else if(bytes < 1073741824){
            return "("+Math.round(bytes/(1024*1024)*10)/10+'MB'+")";
        }else if(bytes < 1099511627776){
            return "("+Math.round(bytes/(1024*1024*1024)*10)/10+'GB'+")";
        }else{
            return "("+Math.round(bytes/(1024*1024*1024*1024))+'TB'+")";
        }
    }

    return (
        <NgIf type="inline" className="component_filesize" cond={props.type === 'file'}>
          <span>{displaySize(props.size)}</span>
        </NgIf>
    );
};

const Message = (props) => {
    return (
        <NgIf cond={props.message !== null} className="component_message" type="inline">
          - {props.message}
        </NgIf>
    );
};