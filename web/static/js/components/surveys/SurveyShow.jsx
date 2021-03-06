// @flow
import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import * as actions from '../../actions/survey'
import * as respondentActions from '../../actions/respondents'
import SurveyStatus from './SurveyStatus'
import * as routes from '../../routes'
import { Tooltip, Modal, dispositionGroupLabel, dispositionLabel } from '../ui'
import { stopSurvey } from '../../api'
import sum from 'lodash/sum'
import { modeLabel } from '../../questionnaire.mode'
import { referenceColorClasses, referenceColors } from '../../referenceColors'
import classNames from 'classnames/bind'
import { Stats, Forecasts } from '@instedd/surveda-d3-components'
import { translate } from 'react-i18next'

type State = {
  responsive: boolean,
  contacted: boolean,
  uncontacted: boolean,
  stopUnderstood: boolean
};

class SurveyShow extends Component<any, State> {
  static propTypes = {
    t: PropTypes.func,
    dispatch: PropTypes.func,
    router: PropTypes.object,
    project: PropTypes.object,
    projectId: PropTypes.string.isRequired,
    surveyId: PropTypes.string.isRequired,
    survey: PropTypes.object,
    questionnaires: PropTypes.object,
    respondentsByDisposition: PropTypes.object,
    reference: PropTypes.array,
    completedByDate: PropTypes.object,
    contactedRespondents: PropTypes.number,
    totalRespondents: PropTypes.number,
    target: PropTypes.number,
    completionPercentage: PropTypes.number,
    cumulativePercentages: PropTypes.object
  }

  constructor(props) {
    super(props)
    this.state = {
      responsive: false, contacted: false, uncontacted: false, stopUnderstood: false
    }
  }

  componentWillMount() {
    const { dispatch, projectId, surveyId } = this.props
    dispatch(actions.fetchSurveyIfNeeded(projectId, surveyId))
    dispatch(respondentActions.fetchRespondentsStats(projectId, surveyId))
  }

  componentDidUpdate() {
    const { survey, router } = this.props
    if (survey && survey.state == 'not_ready') {
      router.replace(routes.surveyEdit(survey.projectId, survey.id))
    }
  }

  stopSurvey() {
    this.setState({stopUnderstood: false})
    this.refs.stopModal.open()
  }

  toggleStopUnderstood() {
    this.setState((state) => ({ stopUnderstood: !state.stopUnderstood }))
  }

  stopCancel() {
    this.refs.stopModal.close()
  }

  confirmStopSurvey() {
    const { projectId, surveyId, router } = this.props
    this.refs.stopModal.close()
    stopSurvey(projectId, surveyId)
      .then(() => router.push(routes.surveyEdit(projectId, surveyId)))
  }

  iconForMode(mode: string) {
    const { t } = this.props
    let icon = null
    switch (mode) {
      case 'sms':
        icon = 'sms'
        break
      case 'ivr':
        icon = 'phone'
        break
      case 'mobileweb':
        icon = 'phonelink'
        break
      default:
        throw new Error(t('Unknown mode: {{mode}}', {mode}))
    }
    return icon
  }

  letterForIndex(index) {
    return String.fromCodePoint(65 + index) // A, B, C, ...
  }

  titleFor(questionnaires) {
    return Object.keys(questionnaires).length > 1
      ? this.props.t('Questionnaire performance comparison')
      : questionnaires[Object.keys(questionnaires)[0]].name
  }

  render() {
    const { questionnaires, survey, respondentsByDisposition, reference, contactedRespondents, cumulativePercentages, target, project, t } = this.props
    const { stopUnderstood } = this.state

    if (!survey || !cumulativePercentages || !questionnaires || !respondentsByDisposition || !reference) {
      return <p>{t('Loading...')}</p>
    }

    const readOnly = !project || project.readOnly

    let stopComponent = null
    if (!readOnly && survey.state == 'running') {
      stopComponent = (
        <Tooltip text={t('Stop survey')}>
          <a className='btn-floating btn-large waves-effect waves-light red right mtop' onClick={() => this.stopSurvey()}>
            <i className='material-icons'>stop</i>
          </a>
        </Tooltip>
      )
    }

    let title = this.titleFor(questionnaires)

    let stats = [
      {value: target, label: t('Target')},
      {value: respondentsByDisposition.responsive.detail.completed.count, label: t('Completes')},
      {value: respondentsByDisposition.responsive.detail.partial.count, label: t('Partials')},
      {value: contactedRespondents, label: t('Contacted Respondents')}
    ]

    let colors = referenceColors(reference.length)

    let forecastsReferences = reference.map((r, i) => {
      const name = r.name ? r.name : ''
      const modes = r.modes ? modeLabel(r.modes) : ''
      const separator = name && modes ? ' | ' : ''

      return {
        label: `${name}${separator}${modes}`,
        color: colors[i],
        id: r.id
      }
    })

    // TODO: we should be doing this when receiving properties, not at render
    let forecasts = forecastsReferences.map(d => {
      const values = (cumulativePercentages[d.id] || []).map(v => (
        { time: new Date(v.date), value: Number(v.percent) }
      ))

      return {...d, values}
    })

    return (
      <div className='cockpit'>
        <div className='row'>
          {stopComponent}
          <Modal card ref='stopModal' id='stop_survey_modal'>
            <div className='modal-content'>
              <div className='card-title header'>
                <h5>{t('Stop survey')}</h5>
                <p>{t('This will finalize the survey execution')}</p>
              </div>
              <div className='card-content'>
                <div className='row'>
                  <div className='col s12'>
                    <p className='red-text alert-left-icon'>
                      <i className='material-icons'>warning</i>
                      {t('Stopped surveys cannot be restarted')}
                    </p>
                  </div>
                </div>
                <div className='row'>
                  <div className='col s12'>
                    <p>
                      {t('Once you stop the survey, all invitations will be halted immediately.')}
                    </p>
                    <p>
                      {t('Respondents who are currently answering the survey will be cut off. Once you stop, you cannot restart.')}
                    </p>
                  </div>
                </div>
                <div className='row'>
                  <div className='col s12'>
                    <input
                      id='stop_understood'
                      type='checkbox'
                      checked={stopUnderstood}
                      onChange={() => this.toggleStopUnderstood()}
                      className='filled-in' />
                    <label htmlFor='stop_understood'>{t('Understood')}</label>
                  </div>
                </div>
              </div>
              <div className='card-action'>
                <a
                  className={classNames('btn-large red', { disabled: !stopUnderstood })}
                  onClick={() => this.confirmStopSurvey()}>
                  {t('Stop')}
                </a>
                <a className='btn-flat grey-text' onClick={() => this.stopCancel()}>{t('Cancel')}</a>
              </div>
            </div>
          </Modal>
          <h4>
            {title}
          </h4>
          <SurveyStatus survey={survey} />
          <div className='col s12'>
            <div className='card' style={{'width': '100%', padding: '60px 30px'}}>
              <div className='header'>
                <div className='title'>{t('Percent of completes')}</div>
                {survey.countPartialResults
                  ? <div className='description'>{t('Count partials as completed')}</div>
                  : ''
                }
              </div>

              <Stats data={stats} />
              <Forecasts data={forecasts} ceil={100} forecast={survey.state == 'running'} />
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col s12'>
            {this.dispositions(respondentsByDisposition, reference)}
          </div>
        </div>
      </div>
    )
  }

  // Round a number to two decimals, but only if the number has decimals
  round(num) {
    if (num == parseInt(num)) {
      return num
    } else {
      return num.toFixed(2)
    }
  }

  expandGroup(group) {
    let newState = {
      ...this.state
    }
    newState[group] = !this.state[group]
    this.setState(newState)
  }

  groupRows(group, groupStats, reference) {
    let details = groupStats.detail
    let detailsKeys = Object.keys(details)
    let referenceIds = Object.keys(reference)
    let colorClasses = referenceColorClasses(referenceIds.length)

    const groupStatsbyReference = (referenceIds, detailsKeys, colorClasses, details) => {
      if (referenceIds.length > 1) {
        return referenceIds.map((referenceId, i) => {
          const totals = detailsKeys.map((detail) => details[detail].byReference[referenceId] || 0)
          return <td key={referenceId} className={classNames('right-align', colorClasses[i])}>{sum(totals)}</td>
        })
      }
    }
    const groupRow =
      <tr key={group}>
        <td>{dispositionGroupLabel(group)}</td>
        {groupStatsbyReference(referenceIds, detailsKeys, colorClasses, details)}
        <td className='right-align'>{groupStats.count}</td>
        <td className='right-align'>{this.round(groupStats.percent)}%</td>
        <td className='expand-column'>
          <a className='link' onClick={e => this.expandGroup(group)}>
            <i className='material-icons right grey-text'>{this.state[group] ? 'expand_less' : 'expand_more'}</i>
          </a>
        </td>
      </tr>

    let rows = null
    if (this.state[group]) {
      rows = detailsKeys.map((detail) => {
        let individualStat = details[detail]

        let byReference = individualStat['byReference']
        let referenceColumns = null
        if (referenceIds.length > 1) {
          referenceColumns = referenceIds.map((referenceId, i) => {
            let value = null
            if (detail == 'registered') {
              value = '-'
            } else {
              value = byReference[referenceId] || 0
            }

            return <td key={referenceId} className={classNames('right-align', colorClasses[i])}>{value}</td>
          })
        }

        return (
          <tr className='detail-row' key={detail}>
            <td>{dispositionLabel(detail)}</td>
            {referenceColumns}
            <td className='right-align'>{individualStat.count}</td>
            <td className='right-align'>{this.round(individualStat.percent)}%</td>
            <td className='expand-column' />
          </tr>
        )
      })
    }

    return [groupRow, rows]
  }

  dispositions(respondentsByDisposition, reference) {
    const { t } = this.props
    const dispositionsGroup = ['responsive', 'contacted', 'uncontacted']
    let referenceIds = Object.keys(reference)
    return (
      <div className='card overflow'>
        <div className='card-table-title'>
          {t('Dispositions')}
        </div>
        <div className='card-table'>
          <table>
            <thead>
              <tr>
                <th>{t('Status')}</th>
                {referenceIds.length > 1 ? referenceIds.map((referenceId) => (<th key={referenceId} className='right-align' />)) : []}
                <th className='right-align'>{t('Quantity')}</th>
                <th className='right-align'>
                  {t('Percent')}
                </th>
              </tr>
            </thead>
            <tbody>
              {
                dispositionsGroup.map(group => {
                  let groupStats = respondentsByDisposition[group]
                  return this.groupRows(group, groupStats, reference)
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const respondentsStatsRoot = state.respondentsStats[ownProps.params.surveyId]

  let respondentsByDisposition = null
  let cumulativePercentages = {}
  let contactedRespondents = 0
  let totalRespondents = 0
  let target = 0
  let completionPercentage = 0
  let reference = null

  if (respondentsStatsRoot) {
    respondentsByDisposition = respondentsStatsRoot.respondentsByDisposition
    cumulativePercentages = respondentsStatsRoot.cumulativePercentages
    contactedRespondents = respondentsStatsRoot.contactedRespondents
    totalRespondents = respondentsStatsRoot.totalRespondents
    target = respondentsStatsRoot.target
    completionPercentage = respondentsStatsRoot.completionPercentage
    reference = respondentsStatsRoot.reference
  }

  return ({
    projectId: ownProps.params.projectId,
    project: state.project.data,
    surveyId: ownProps.params.surveyId,
    survey: state.survey.data,
    questionnaires: !state.survey.data ? {} : state.survey.data.questionnaires,
    respondentsByDisposition: respondentsByDisposition,
    cumulativePercentages: cumulativePercentages,
    contactedRespondents: contactedRespondents,
    totalRespondents: totalRespondents,
    target: target,
    reference: reference,
    completionPercentage: completionPercentage
  })
}

export default translate()(withRouter(connect(mapStateToProps)(SurveyShow)))
