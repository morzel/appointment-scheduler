import { AppointmentModel } from 'appointments/AppointmentModel';
import { IWorkCalendarRefreshAppointment } from 'calendar/work-calendar/WorkCalendar';
import { ClientModel, IClientValidationResult } from 'clients/ClientModel';
import { IClient } from 'clients/IClient';
import { Button } from 'components/Button';
import { ButtonBarField, Option } from 'components/ButtonBarField';
import { TextField } from 'components/TextField';
import { IItem, TypeaheadField } from 'components/TypeaheadField';
import { ReactComponent as CalendarIcon } from 'icons/calendar-alt-regular.svg';
import { ReactComponent as ClockIcon } from 'icons/clock-regular.svg';
import { ReactComponent as CalendarAdd } from 'icons/icon-calendar-add.svg';
import { ReactComponent as EditIcon } from 'icons/icon-edit.svg';
import { ReactComponent as RemoveUserIcon } from 'icons/icon-user-remove.svg';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { RootStore } from 'RootStore';
import { UnsubscribeCallback } from 'utils/CallbackHandler';
import { normalizeDate, normalizeTime } from 'utils/dateTimeUtils';
import './RightPane.css';

interface IProps {
  rootStore?: RootStore;
}

interface IState {
  form: Pick<IClient, keyof IClient> & {
    date: string;
    time: string;
    duration: number;
  };
  client?: ClientModel;
  appointment?: AppointmentModel;
  clientVal: IClientValidationResult;
  editName: boolean;
}

const DEFAULT_DURATION: number = 30;

@inject('rootStore')
@observer
export class RightPane extends React.Component<IProps, IState> {
  public readonly state: IState = {
    form: {
      fullName: '',
      phoneNumber: '',
      email: '',
      date: '',
      time: '',
      duration: DEFAULT_DURATION
    },
    clientVal: { isValid: true },
    editName: false
  };

  private subscriptionId?: string;
  private unsubscribeSelectionChange!: UnsubscribeCallback;

  public componentDidMount() {
    const rootStore = this.getRootStore();
    const { appointmentsModel } = rootStore;
    this.unsubscribeSelectionChange = appointmentsModel.onAppointmentSelectionChange(
      this.handleAppointmentSelectionChange
    );
    this.subscriptionId = rootStore.pubSub.subscribe<
      IWorkCalendarRefreshAppointment
    >('workCalendarRefreshAppointment', this.handleRefreshAppointment);
  }

  public componentWillUnmount() {
    this.unsubscribeSelectionChange();
    if (this.subscriptionId !== undefined) {
      const { pubSub } = this.getRootStore();
      pubSub.unsubscribe('workCalendarItemClick', this.subscriptionId);
    }
  }

  public render() {
    const {
      form: { fullName, phoneNumber, email, date, time, duration },
      client,
      appointment,
      clientVal,
      editName
    } = this.state;

    const { clientStore } = this.getRootStore();
    return (
      <aside className="app__right-pane">
        <div className="grid-col-2">
          <h2 className="app__right-pane__h">Appointment</h2>
          <button
            className="btn-icon pp__right-pane__h"
            onClick={this.handleOnNewAppointmentClick}
            data-testid="new-appointment"
            disabled={!appointment}
            title="New Appointment"
          >
            <CalendarAdd height="20" />
          </button>
        </div>
        <div className="grid-col-2">
          <TextField
            name="date"
            title="Date"
            value={date}
            suffix={<CalendarIcon className="appointment__calendar-icon" />}
            onChange={this.handleOnChange}
            onBlur={this.handleOnDateBlur}
          />
          <TextField
            name="time"
            title="Time"
            value={time}
            suffix={<ClockIcon className="appointment__calendar-icon" />}
            onChange={this.handleOnChange}
            onBlur={this.handleOnTimeBlur}
          />
        </div>
        <ButtonBarField title="Duration" data-testid="duration">
          <Option
            isSelected={duration === 30}
            value={30}
            onClick={this.handleDurationChange}
          >
            30 min
          </Option>
          <Option
            isSelected={duration === 60}
            value={60}
            onClick={this.handleDurationChange}
          >
            60 min
          </Option>
          <Option
            isSelected={duration === 90}
            value={90}
            onClick={this.handleDurationChange}
          >
            90 min
          </Option>
        </ButtonBarField>
        <TextField title="Services" />
        <div className="grid-col-2">
          <h2 className="app__right-pane__h">Client</h2>
          <button
            className="btn-icon app__right-pane__h"
            onClick={this.handleOnNewClientClick}
            data-testid="new-client-btn"
            disabled={!client}
            title="Remove Client"
          >
            <RemoveUserIcon height="20" />
          </button>
        </div>
        <TypeaheadField
          className="typeahead__full-name"
          title="Full Name"
          name="fn"
          autoComplete="fn"
          disabled={!!client && !editName}
          value={fullName}
          items={!!client ? [] : clientStore.clients}
          isValid={!clientVal.fullName}
          message={clientVal.fullName}
          onChange={this.handleOnChange}
          onSelected={this.handleOnSelected}
          onBlur={this.handleOnClientNameBlur}
          suffix={
            !!client && !editName ? (
              <button className="btn-icon" onClick={this.editClientName}>
                <EditIcon height="20" />
              </button>
            ) : (
              undefined
            )
          }
        />
        <TextField
          title="Email"
          name="em"
          autoComplete="em"
          value={email}
          isValid={!clientVal.email}
          message={clientVal.email}
          onChange={this.handleOnChange}
          onBlur={this.handleClientOnBlur}
        />
        <TextField
          title="Phone Number"
          name="pn"
          autoComplete="pn"
          value={phoneNumber}
          isValid={!clientVal.phoneNumber}
          message={clientVal.phoneNumber}
          onChange={this.handleOnChange}
          onBlur={this.handleClientOnBlur}
        />
        <div className="pane__bottom">
          <Button
            className="btn--secondary"
            data-testid="cancel-appointment"
            disabled={!appointment}
            onClick={this.handleOnCancelAppointment}
          >
            Cancel Appointment
          </Button>
        </div>
      </aside>
    );
  }

  private handleDurationChange = (duration: number) => {
    this.setState(
      {
        form: {
          ...this.state.form,
          duration
        }
      },
      this.handleAppointmentOnBlur
    );
  };

  private handleOnNewClientClick = () => {
    this.setState({
      client: undefined,
      form: {
        fullName: '',
        email: '',
        phoneNumber: '',
        date: '',
        time: '',
        duration: DEFAULT_DURATION
      }
    });
  };

  private handleOnNewAppointmentClick = () => {
    this.clearAppointmentForm();
  };

  private handleOnCancelAppointment = () => {
    const { appointmentsModel } = this.getRootStore();
    appointmentsModel.unselect();
    appointmentsModel.cancel(this.state.appointment!.id);
    this.clearAppointmentForm();
  };

  private handleAppointmentSelectionChange = (appointmentId: string | null) => {
    const { appointmentsModel } = this.getRootStore();
    if (appointmentId !== null) {
      const appointment = appointmentsModel.findById(appointmentId);
      this.appointmentToForm(appointment);
    } else {
      this.clearAppointmentForm();
    }
  };

  private handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.name) {
      const targetName = this.getInputName(event.target.name);
      this.updateForm(targetName, event.target.value, () => {
        const { clientVal } = this.state;
        if (!clientVal.isValid) {
          this.setState({
            clientVal: ClientModel.validate(this.state.form)
          });
        }
      });
    }
  };

  private handleOnSelected = (item: IItem) => {
    const client = item as ClientModel;
    this.setState({
      form: {
        ...this.state.form,
        fullName: client.fullName,
        email: client.email,
        phoneNumber: client.phoneNumber
      },
      client
    });
    const { appointment } = this.state;
    if (appointment) {
      const { appointmentsModel } = this.getRootStore();
      appointmentsModel.update(appointment, { clientId: client.id });
    }
  };

  private handleOnClientNameBlur = () => {
    const { form, client } = this.state;
    // TODO: ask user if new user should be created or existing updated
    if (client && !client.equals(form)) {
      this.setState(
        {
          form: {
            ...this.state.form,
            email: '',
            phoneNumber: ''
          },
          editName: false
        },
        () => {
          this.handleAppointmentOnBlur();
        }
      );
    }
    this.handleClientOnBlur();
  };

  private handleClientOnBlur = () => {
    const { form, client, appointment } = this.state;
    let newClient: ClientModel | undefined = undefined;

    const clientVal = ClientModel.validate(form);
    this.setState({
      clientVal
    });
    if (clientVal.isValid) {
      const { clientStore } = this.getRootStore();
      if (client && client.equals(form)) {
        clientStore.update(client, form);
        newClient = client;
      } else {
        const { fullName, email, phoneNumber } = form;
        if (clientStore.exists(form)) {
          newClient = clientStore.getByFullName(form.fullName);
          this.updateForm('fullName', newClient.fullName);
          this.updateForm('phoneNumber', newClient.phoneNumber);
          this.updateForm('email', newClient.email);
        } else {
          newClient = clientStore.create({ fullName, phoneNumber, email });
        }
        this.setState({
          client: newClient
        });
      }
    }
    if (appointment && newClient) {
      const { appointmentsModel } = this.getRootStore();
      appointmentsModel.update(appointment, {
        ...this.formToAppointment(),
        clientId: newClient.id
      });
    }
  };

  private handleOnDateBlur = () => {
    const baseDate = new Date();
    const { form } = this.state;
    if (form.date) {
      this.updateForm(
        'date',
        normalizeDate(form.date, baseDate),
        this.handleAppointmentOnBlur
      );
    }
  };

  private handleOnTimeBlur = () => {
    const { form } = this.state;
    if (form.time) {
      this.updateForm(
        'time',
        normalizeTime(form.time),
        this.handleAppointmentOnBlur
      );
    }
  };

  private handleAppointmentOnBlur = () => {
    const { form, appointment } = this.state;
    if (form.date && form.time) {
      const { appointmentsModel } = this.getRootStore();
      // TODO: validate date time formats
      if (appointment) {
        appointmentsModel.update(appointment, this.formToAppointment());
      } else {
        const newAppointment = appointmentsModel.create(
          this.formToAppointment()
        );
        appointmentsModel.select(newAppointment.id);
        this.setState({
          appointment: newAppointment
        });
      }
    }
  };

  private handleRefreshAppointment = ({
    appointmentId
  }: IWorkCalendarRefreshAppointment) => {
    const { appointment } = this.state;
    if (appointment && appointment.id === appointmentId) {
      this.appointmentToForm(appointment);
    }
  };

  private updateForm = (name: string, value: string, callback?: () => void) => {
    this.setState(
      prevState =>
        ({
          ...prevState,
          form: {
            ...prevState.form,
            [name]: value
          }
        } as Pick<IState, keyof IState>),
      callback
    );
  };

  private clearAppointmentForm = (callback: () => void = () => {}) => {
    this.setState(
      {
        client: undefined,
        appointment: undefined,
        form: {
          fullName: '',
          email: '',
          phoneNumber: '',
          date: '',
          time: '',
          duration: DEFAULT_DURATION
        },
        clientVal: { isValid: true }
      },
      callback
    );
  };

  private getInputName(name: string) {
    switch (name) {
      case 'fn':
        return 'fullName';
      case 'pn':
        return 'phoneNumber';
      case 'em':
        return 'email';
      default:
        return name;
    }
  }

  private formToAppointment = () => {
    const { form, client } = this.state;
    return {
      date: form.date,
      time: form.time,
      duration: form.duration,
      clientId: client && client.id
    };
  };

  private appointmentToForm = (appointment: AppointmentModel) => {
    const rootStore = this.getRootStore();
    this.setState({
      appointment,
      client: appointment.getClient(rootStore),
      form: {
        date: appointment.getDate(),
        time: appointment.getTime(),
        duration: appointment.duration,
        fullName: appointment.getClientFullName(rootStore),
        email: appointment.getClientEmail(rootStore),
        phoneNumber: appointment.getClientPhoneNumber(rootStore)
      }
    });
  };

  private editClientName = () => {
    this.setState({
      editName: true
    });
  };

  private getRootStore = () => {
    return this.props.rootStore!;
  };
}
